package com.revcart.controller;

import com.revcart.dto.ApiResponse;
import com.revcart.dto.OrderDto;
import com.revcart.dto.PagedResponse;
import com.revcart.dto.request.CheckoutRequest;
import com.revcart.dto.request.DeliveryAssignmentRequest;
import com.revcart.dto.request.OrderStatusUpdateRequest;
import com.revcart.service.OrderService;
import com.revcart.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class OrderController {

    private final OrderService orderService;
    private final PaymentService paymentService;

    public OrderController(OrderService orderService, PaymentService paymentService) {
        this.orderService = orderService;
        this.paymentService = paymentService;
    }

    @PostMapping("/orders/checkout")
    public OrderDto checkout(@Valid @RequestBody CheckoutRequest request) {
        return orderService.checkout(request);
    }

    @GetMapping("/orders")
    public PagedResponse<OrderDto> myOrders(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return orderService.myOrders(pageable);
    }

    @GetMapping("/orders/{id}")
    public OrderDto getOrder(@PathVariable Long id) {
        return orderService.getOrder(id);
    }

    @GetMapping("/admin/orders")
    public PagedResponse<OrderDto> allOrders(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return orderService.allOrders(PageRequest.of(page, size));
    }

    @PostMapping("/admin/orders/{id}/status")
    public OrderDto updateStatus(@PathVariable Long id, @Valid @RequestBody OrderStatusUpdateRequest request) {
        return orderService.updateStatus(id, request);
    }

    @PostMapping("/admin/orders/{id}/assign")
    public OrderDto assignAgent(@PathVariable Long id, @Valid @RequestBody DeliveryAssignmentRequest request) {
        return orderService.assignDeliveryAgent(id, request.getDeliveryAgentId());
    }

    @PostMapping("/orders/{id}/cancel")
    public ApiResponse<OrderDto> cancelOrder(@PathVariable Long id, @RequestParam(required = false) String reason) {
        OrderDto dto = orderService.cancelOrder(id, reason);
        return ApiResponse.<OrderDto>builder().success(true).data(dto).message("Order cancelled").build();
    }

    @PostMapping("/orders/{orderId}/razorpay")
    public Map<String, Object> createRazorpayOrder(@PathVariable Long orderId) {
        return paymentService.createRazorpayOrder(orderId);
    }

    @PostMapping("/orders/{orderId}/verify-payment")
    public ApiResponse<OrderDto> verifyPayment(@PathVariable Long orderId, @RequestBody Map<String, String> paymentData) {
        OrderDto order = paymentService.verifyRazorpayPayment(orderId, paymentData);
        return ApiResponse.<OrderDto>builder().success(true).data(order).message("Payment verified").build();
    }
}

