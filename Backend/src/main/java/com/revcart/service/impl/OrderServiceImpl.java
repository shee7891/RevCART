package com.revcart.service.impl;

import com.revcart.document.DeliveryTrackingLog;
import com.revcart.dto.OrderDto;
import com.revcart.dto.PagedResponse;
import com.revcart.dto.request.CheckoutRequest;
import com.revcart.dto.request.OrderStatusUpdateRequest;
import com.revcart.entity.Address;
import com.revcart.entity.Cart;
import com.revcart.entity.CartItem;
import com.revcart.entity.Inventory;
import com.revcart.entity.Order;
import com.revcart.entity.OrderItem;
import com.revcart.entity.Payment;
import com.revcart.entity.Product;
import com.revcart.entity.User;
import com.revcart.enums.OrderStatus;
import com.revcart.enums.PaymentStatus;
import com.revcart.enums.UserRole;
import com.revcart.exception.BadRequestException;
import com.revcart.exception.ResourceNotFoundException;
import com.revcart.mapper.OrderMapper;
import com.revcart.repository.AddressRepository;
import com.revcart.repository.CartRepository;
import com.revcart.repository.InventoryRepository;
import com.revcart.repository.OrderRepository;
import com.revcart.repository.PaymentRepository;
import com.revcart.repository.ProductRepository;
import com.revcart.repository.UserRepository;
import com.revcart.repository.mongo.DeliveryTrackingLogRepository;
import com.revcart.service.NotificationService;
import com.revcart.service.OrderService;
import com.revcart.service.PaymentService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OrderServiceImpl implements OrderService {

    private static final Logger logger = LoggerFactory.getLogger(OrderServiceImpl.class);

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final AddressRepository addressRepository;
    private final InventoryRepository inventoryRepository;
    private final NotificationService notificationService;
    private final DeliveryTrackingLogRepository deliveryTrackingLogRepository;
    private final PaymentService paymentService;

    public OrderServiceImpl(
            OrderRepository orderRepository,
            CartRepository cartRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            PaymentRepository paymentRepository,
            AddressRepository addressRepository,
            InventoryRepository inventoryRepository,
            NotificationService notificationService,
            DeliveryTrackingLogRepository deliveryTrackingLogRepository,
            PaymentService paymentService) {
        this.orderRepository = orderRepository;
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.paymentRepository = paymentRepository;
        this.addressRepository = addressRepository;
        this.inventoryRepository = inventoryRepository;
        this.notificationService = notificationService;
        this.deliveryTrackingLogRepository = deliveryTrackingLogRepository;
        this.paymentService = paymentService;
    }

    @Override
    @CacheEvict(value = "products", allEntries = true)
    public OrderDto checkout(CheckoutRequest request) {
        logger.info("Starting checkout process");
        User user = getCurrentUser();
        logger.debug("Checkout for user ID: {}", user.getId());
        Address address = addressRepository.findById(request.getAddressId())
                .orElseThrow(() -> new ResourceNotFoundException("Address not found"));
        Cart cart = cartRepository.findByUser(user)
                .orElseThrow(() -> new BadRequestException("Cart not found"));
        if (cart.getItems().isEmpty()) {
            throw new BadRequestException("Cart empty");
        }
        logger.debug("Cart has {} items", cart.getItems().size());
        Order order = new Order();
        order.setUser(user);
        order.setShippingAddress(address);
        order.setStatus(OrderStatus.PLACED);
        
        // Set payment status based on payment method
        if (request.getPaymentMethod() != null && request.getPaymentMethod().toString().equals("COD")) {
            order.setPaymentStatus(PaymentStatus.PENDING);
        } else {
            order.setPaymentStatus(PaymentStatus.PENDING);
        }
        BigDecimal total = BigDecimal.ZERO;
        for (CartItem cartItem : cart.getItems()) {
            logger.debug("Processing cart item - Product ID: {}, Quantity: {}", cartItem.getProduct().getId(),
                    cartItem.getQuantity());
            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(cartItem.getProduct());
            item.setQuantity(cartItem.getQuantity());
            item.setUnitPrice(cartItem.getPrice());
            item.setSubtotal(cartItem.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity())));
            order.getItems().add(item);
            total = total.add(item.getSubtotal());
            reserveInventory(cartItem.getProduct(), cartItem.getQuantity());
            logger.debug("Successfully reserved inventory for product ID: {}", cartItem.getProduct().getId());
        }
        logger.info("All inventory reservations completed");
        order.setTotalAmount(total);
        Order saved = orderRepository.save(order);
        logger.info("Order created successfully with ID: {}", saved.getId());
        createTrackingLog(saved, OrderStatus.PLACED, "Order placed");
        cart.getItems().clear();
        cartRepository.save(cart);
        logger.debug("Cart cleared and saved");
        paymentService.initiatePayment(saved.getId());
        logger.debug("Payment initiated for order ID: {}", saved.getId());
        
        // Only send notification for COD orders, Razorpay orders will notify after payment
        if (request.getPaymentMethod() != null && request.getPaymentMethod().toString().equals("COD")) {
            notificationService.pushOrderUpdate(user.getId(), "Order #" + saved.getId() + " placed successfully");
        }
        
        logger.info("Checkout completed successfully for order ID: {}", saved.getId());
        return OrderMapper.toDto(saved);
    }

    @Override
    public PagedResponse<OrderDto> myOrders(Pageable pageable) {
        User user = getCurrentUser();
        Page<Order> page = orderRepository.findByUser(user, pageable);
        return mapPage(page);
    }

    @Override
    public PagedResponse<OrderDto> allOrders(Pageable pageable) {
        Page<Order> page = orderRepository.findAll(pageable);
        return mapPage(page);
    }

    @Override
    public OrderDto getOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        return OrderMapper.toDto(order);
    }

    @Override
    public OrderDto updateStatus(Long orderId, OrderStatusUpdateRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        order.setStatus(request.getStatus());
        if (request.getStatus() == OrderStatus.DELIVERED) {
            order.setPaymentStatus(PaymentStatus.SUCCESS);
            order.setDeliveredAt(Instant.now());
        }

        // Auto-assign delivery agent when order status changes to PACKED
        if (request.getStatus() == OrderStatus.PACKED && order.getDeliveryAgent() == null) {
            User assignedAgent = findBestAvailableAgent();
            if (assignedAgent != null) {
                order.setDeliveryAgent(assignedAgent);
                notificationService.pushOrderUpdate(
                        order.getUser().getId(),
                        "Delivery agent " + assignedAgent.getFullName() + " assigned to order #" + order.getId());
            }
        }

        createTrackingLog(order, request.getStatus(), request.getNote());
        notificationService.pushOrderUpdate(order.getUser().getId(),
                "Order #" + order.getId() + " status updated to " + request.getStatus());
        return OrderMapper.toDto(orderRepository.save(order));
    }

    @Override
    public OrderDto assignDeliveryAgent(Long orderId, Long agentId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent not found"));
        order.setDeliveryAgent(agent);
        notificationService.pushOrderUpdate(
                order.getUser().getId(), "Delivery agent assigned for order #" + order.getId());
        return OrderMapper.toDto(orderRepository.save(order));
    }

    @Override
    public OrderDto cancelOrder(Long orderId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        order.setStatus(OrderStatus.CANCELLED);
        order.setPaymentStatus(PaymentStatus.REFUNDED);
        orderRepository.save(order);
        restockInventory(order);
        paymentService.handleRefund(orderId);
        notificationService.pushOrderUpdate(
                order.getUser().getId(), "Order #" + orderId + " cancelled. Reason: " + reason);
        return OrderMapper.toDto(order);
    }

    @Override
    public PagedResponse<OrderDto> deliveryOrders(OrderStatus status, Pageable pageable) {
        User agent = getCurrentUser();
        List<Order> orders = orderRepository.findByDeliveryAgentAndStatus(agent, status);
        int start = (int) pageable.getOffset();
        if (start > orders.size()) {
            start = orders.size();
        }
        int end = Math.min(start + pageable.getPageSize(), orders.size());
        List<OrderDto> content = orders.subList(start, end).stream()
                .map(OrderMapper::toDto)
                .collect(Collectors.toList());
        int totalPages = (int) Math.ceil((double) orders.size() / pageable.getPageSize());
        return PagedResponse.<OrderDto>builder()
                .content(content)
                .page(pageable.getPageNumber())
                .size(pageable.getPageSize())
                .totalElements(orders.size())
                .totalPages(totalPages)
                .build();
    }

    @Override
    public Map<String, Object> getDeliveryStatistics() {
        User agent = getCurrentUser();
        long assigned = orderRepository.countAssignedOrders(agent);
        long inTransit = orderRepository.countInTransitOrders(agent);

        // Calculate start and end of today
        LocalDate today = LocalDate.now();
        Instant startOfDay = today.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endOfDay = today.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        long deliveredToday = orderRepository.countDeliveredToday(agent, startOfDay, endOfDay);

        long pending = orderRepository.countPendingOrders();

        return Map.of(
                "assigned", assigned,
                "inTransit", inTransit,
                "deliveredToday", deliveredToday,
                "pending", pending);
    }

    @Override
    public List<OrderDto> getAssignedOrders() {
        User agent = getCurrentUser();
        return orderRepository.findAssignedOrders(agent).stream()
                .map(OrderMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<OrderDto> getInTransitOrders() {
        User agent = getCurrentUser();
        return orderRepository.findInTransitOrders(agent).stream()
                .map(OrderMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<OrderDto> getPendingOrders() {
        return orderRepository.findPendingOrders().stream()
                .map(OrderMapper::toDto)
                .collect(Collectors.toList());
    }

    private void reserveInventory(Product product, Integer qty) {
        logger.debug("Attempting to reserve inventory for product ID: {} with quantity: {}", product.getId(), qty);

        // Refresh product to ensure we have fresh data
        Product refreshedProduct = productRepository.findById(product.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        Inventory inventory = inventoryRepository.findByProduct(refreshedProduct)
                .orElseThrow(() -> {
                    logger.error("Inventory record not found for product ID: {}", refreshedProduct.getId());
                    return new ResourceNotFoundException("Inventory missing");
                });

        logger.debug("Current available quantity: {} for product ID: {}", inventory.getAvailableQuantity(),
                refreshedProduct.getId());

        if (inventory.getAvailableQuantity() == null || inventory.getAvailableQuantity() < qty) {
            int availableQty = inventory.getAvailableQuantity() != null ? inventory.getAvailableQuantity() : 0;
            logger.warn("Insufficient stock for product ID: {}. Available: {}, Requested: {}",
                    refreshedProduct.getId(), availableQty, qty);
            throw new BadRequestException("Insufficient stock");
        }

        int newQuantity = inventory.getAvailableQuantity() - qty;
        inventory.setAvailableQuantity(newQuantity);
        Inventory saved = inventoryRepository.save(inventory);
        logger.info("Inventory reserved successfully for product ID: {}. Previous: {}, New available quantity: {}",
                refreshedProduct.getId(), inventory.getAvailableQuantity() + qty, saved.getAvailableQuantity());
    }

    private void restockInventory(Order order) {
        for (OrderItem item : order.getItems()) {
            Inventory inventory = inventoryRepository.findByProduct(item.getProduct())
                    .orElseThrow(() -> new ResourceNotFoundException("Inventory missing"));
            inventory.setAvailableQuantity(inventory.getAvailableQuantity() + item.getQuantity());
            inventoryRepository.save(inventory);
        }
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private void createTrackingLog(Order order, OrderStatus status, String note) {
        DeliveryTrackingLog log = new DeliveryTrackingLog();
        log.setOrderId(order.getId());
        log.setStatus(status);
        log.setNote(note);
        deliveryTrackingLogRepository.save(log);
    }

    private PagedResponse<OrderDto> mapPage(Page<Order> page) {
        List<OrderDto> content = page.getContent().stream()
                .map(OrderMapper::toDto)
                .collect(Collectors.toList());
        return PagedResponse.<OrderDto>builder()
                .content(content)
                .page(page.getNumber())
                .size(page.getSize())
                .totalPages(page.getTotalPages())
                .totalElements(page.getTotalElements())
                .build();
    }

    /**
     * Finds the best available delivery agent based on current workload.
     * Returns the agent with the least number of active orders (PACKED or
     * OUT_FOR_DELIVERY).
     * Returns null if no active delivery agents are available.
     */
    private User findBestAvailableAgent() {
        List<User> activeAgents = userRepository.findActiveByRole(UserRole.DELIVERY_AGENT);

        if (activeAgents.isEmpty()) {
            return null;
        }

        // Find agent with minimum workload
        User bestAgent = null;
        long minWorkload = Long.MAX_VALUE;

        for (User agent : activeAgents) {
            long workload = orderRepository.countAssignedOrders(agent);
            if (workload < minWorkload) {
                minWorkload = workload;
                bestAgent = agent;
            }
        }

        return bestAgent;
    }
}
