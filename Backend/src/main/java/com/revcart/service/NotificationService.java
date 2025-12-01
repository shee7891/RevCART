package com.revcart.service;

import com.revcart.dto.NotificationDto;
import java.util.List;

public interface NotificationService {
    void pushOrderUpdate(Long userId, String message);
    void pushPaymentConfirmation(Long userId, String message);
    List<NotificationDto> getNotifications();
    void markAsRead(String notificationId);
    long unreadCount();
}

