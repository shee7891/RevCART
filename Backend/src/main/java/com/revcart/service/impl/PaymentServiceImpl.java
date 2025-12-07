package com.revcart.service.impl;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import com.revcart.dto.OrderDto;
import com.revcart.dto.PaymentDto;
import com.revcart.dto.request.PaymentCaptureRequest;
import com.revcart.entity.Order;
import com.revcart.entity.Payment;
import com.revcart.enums.PaymentMethod;
import com.revcart.enums.PaymentStatus;
import com.revcart.exception.BadRequestException;
import com.revcart.exception.ResourceNotFoundException;
import com.revcart.mapper.OrderMapper;
import com.revcart.repository.OrderRepository;
import com.revcart.repository.PaymentRepository;
import com.revcart.service.NotificationService;
import com.revcart.service.PaymentService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PaymentServiceImpl implements PaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentServiceImpl.class);

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final NotificationService notificationService;
    private RazorpayClient razorpayClient;

    @Value("${razorpay.key-id:rzp_test_dummy}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret:dummy_secret}")
    private String razorpayKeySecret;

    public PaymentServiceImpl(
            PaymentRepository paymentRepository,
            OrderRepository orderRepository,
            NotificationService notificationService) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.notificationService = notificationService;
    }

    private RazorpayClient getRazorpayClient() {
        if (razorpayClient == null) {
            try {
                razorpayClient = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            } catch (RazorpayException e) {
                logger.error("Failed to initialize Razorpay client", e);
                throw new BadRequestException("Payment service unavailable");
            }
        }
        return razorpayClient;
    }

    @Override
    public PaymentDto initiatePayment(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        Payment payment = paymentRepository.findByOrder(order).orElseGet(() -> {
            Payment p = new Payment();
            p.setOrder(order);
            p.setAmount(order.getTotalAmount());
            p.setCurrency("INR");
            return p;
        });
        payment.setStatus(PaymentStatus.PENDING);
        return map(paymentRepository.save(payment));
    }

    @Override
    public PaymentDto capturePayment(PaymentCaptureRequest request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        Payment payment = paymentRepository.findByOrder(order)
                .orElseThrow(() -> new BadRequestException("Payment not initiated"));
        payment.setMethod(request.getMethod());
        payment.setProviderPaymentId(request.getProviderPaymentId());
        payment.setPaymentSignature(request.getSignature());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(Instant.now());
        order.setPaymentStatus(PaymentStatus.SUCCESS);
        orderRepository.save(order);
        PaymentDto paymentDto = map(paymentRepository.save(payment));

        // Send payment confirmation notification
        notificationService.pushPaymentConfirmation(
                order.getUser().getId(),
                "Payment of ₹" + payment.getAmount() + " confirmed for order #" + order.getId());

        return paymentDto;
    }

    @Override
    public void handleRefund(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        Payment payment = paymentRepository.findByOrder(order).orElse(null);
        if (payment == null) {
            return;
        }
        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setRefundReferenceId("REF-" + payment.getId());
        paymentRepository.save(payment);
    }

    @Override
    public Map<String, Object> createRazorpayOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", order.getTotalAmount().multiply(BigDecimal.valueOf(100)).intValue());
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "order_" + orderId);

            com.razorpay.Order razorpayOrder = getRazorpayClient().orders.create(orderRequest);

            Map<String, Object> response = new HashMap<>();
            response.put("orderId", razorpayOrder.get("id"));
            response.put("amount", razorpayOrder.get("amount"));
            response.put("currency", razorpayOrder.get("currency"));
            response.put("key", razorpayKeyId);

            return response;
        } catch (RazorpayException e) {
            logger.error("Failed to create Razorpay order", e);
            throw new BadRequestException("Failed to create payment order");
        }
    }

    @Override
    public OrderDto verifyRazorpayPayment(Long orderId, Map<String, String> paymentData) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", paymentData.get("razorpay_order_id"));
            options.put("razorpay_payment_id", paymentData.get("razorpay_payment_id"));
            options.put("razorpay_signature", paymentData.get("razorpay_signature"));

            boolean isValid = Utils.verifyPaymentSignature(options, razorpayKeySecret);

            if (isValid) {
                Payment payment = paymentRepository.findByOrder(order).orElseGet(() -> {
                    Payment p = new Payment();
                    p.setOrder(order);
                    p.setAmount(order.getTotalAmount());
                    p.setCurrency("INR");
                    return p;
                });

                payment.setMethod(PaymentMethod.RAZORPAY);
                payment.setProviderPaymentId(paymentData.get("razorpay_payment_id"));
                payment.setPaymentSignature(paymentData.get("razorpay_signature"));
                payment.setStatus(PaymentStatus.SUCCESS);
                payment.setPaidAt(Instant.now());
                paymentRepository.save(payment);

                order.setPaymentStatus(PaymentStatus.SUCCESS);
                orderRepository.save(order);

                // Send both order placed and payment confirmation notifications
                notificationService.pushOrderUpdate(
                        order.getUser().getId(),
                        "Order #" + order.getId() + " placed successfully");
                notificationService.pushPaymentConfirmation(
                        order.getUser().getId(),
                        "Payment of ₹" + payment.getAmount() + " confirmed for order #" + order.getId());

                return OrderMapper.toDto(order);
            } else {
                throw new BadRequestException("Payment verification failed");
            }
        } catch (RazorpayException e) {
            logger.error("Payment verification failed", e);
            throw new BadRequestException("Payment verification failed");
        }
    }

    private PaymentDto map(Payment payment) {
        return PaymentDto.builder()
                .id(payment.getId())
                .method(payment.getMethod())
                .status(payment.getStatus())
                .amount(payment.getAmount())
                .providerPaymentId(payment.getProviderPaymentId())
                .paidAt(payment.getPaidAt())
                .build();
    }
}

