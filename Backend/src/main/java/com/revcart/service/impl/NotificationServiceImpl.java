package com.revcart.service.impl;

import com.revcart.document.NotificationDocument;
import com.revcart.dto.NotificationDto;
import com.revcart.enums.NotificationType;
import com.revcart.mapper.NotificationMapper;
import com.revcart.repository.UserRepository;
import com.revcart.repository.mongo.NotificationDocumentRepository;
import com.revcart.service.NotificationService;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class NotificationServiceImpl implements NotificationService {

    private final NotificationDocumentRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    public NotificationServiceImpl(
            NotificationDocumentRepository notificationRepository,
            SimpMessagingTemplate messagingTemplate,
            UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
        this.userRepository = userRepository;
    }

    @Override
    public void pushOrderUpdate(Long userId, String message) {
        NotificationDocument doc = new NotificationDocument();
        doc.setUserId(userId);
        doc.setMessage(message);
        doc.setType(NotificationType.ORDER_STATUS);
        NotificationDocument saved = notificationRepository.save(doc);
        String topic = "/topic/orders/" + userId;
        System.out.println("📤 Sending notification to topic: " + topic + ", message: " + message);
        messagingTemplate.convertAndSend(topic, NotificationMapper.toDto(saved));
        System.out.println("✅ Notification sent successfully");
    }

    @Override
    public void pushPaymentConfirmation(Long userId, String message) {
        NotificationDocument doc = new NotificationDocument();
        doc.setUserId(userId);
        doc.setMessage(message);
        doc.setType(NotificationType.PAYMENT);
        NotificationDocument saved = notificationRepository.save(doc);
        String topic = "/topic/orders/" + userId;
        System.out.println("📤 Sending payment notification to topic: " + topic + ", message: " + message);
        messagingTemplate.convertAndSend(topic, NotificationMapper.toDto(saved));
        System.out.println("✅ Payment notification sent successfully");
    }

    @Override
    public List<NotificationDto> getNotifications() {
        Long userId = getCurrentUserId();
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public void markAsRead(String notificationId) {
        notificationRepository.findById(notificationId).ifPresent(doc -> {
            doc.setRead(true);
            notificationRepository.save(doc);
        });
    }

    @Override
    public long unreadCount() {
        Long userId = getCurrentUserId();
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new IllegalStateException("No authenticated user");
        }
        return userRepository.findByEmail(authentication.getName())
                .map(user -> user.getId())
                .orElseThrow();
    }
}

