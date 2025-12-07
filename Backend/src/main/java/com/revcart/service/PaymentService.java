package com.revcart.service;

import com.revcart.dto.OrderDto;
import com.revcart.dto.PaymentDto;
import com.revcart.dto.request.PaymentCaptureRequest;
import java.util.Map;

public interface PaymentService {
    PaymentDto initiatePayment(Long orderId);
    PaymentDto capturePayment(PaymentCaptureRequest request);
    void handleRefund(Long orderId);
    Map<String, Object> createRazorpayOrder(Long orderId);
    OrderDto verifyRazorpayPayment(Long orderId, Map<String, String> paymentData);
}

