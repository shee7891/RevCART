package com.revcart.controller;

import com.revcart.dto.ApiResponse;
import com.revcart.dto.AuthResponse;
import com.revcart.dto.AuthResponse;
import com.revcart.dto.UserDto;
import com.revcart.dto.request.AuthRequest;
import com.revcart.dto.request.OtpVerificationRequest;
import com.revcart.dto.request.PasswordResetRequest;
import com.revcart.dto.request.RegisterRequest;
import com.revcart.service.AuthService;
import com.revcart.service.MailService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final MailService mailService;

    public AuthController(AuthService authService, MailService mailService) {
        this.authService = authService;
        this.mailService = mailService;
    }

    @PostMapping("/register")
    public ApiResponse<String> register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        return authService.login(request);
    }

    @PostMapping("/verify-otp")
    public ApiResponse<String> verifyOtp(@Valid @RequestBody OtpVerificationRequest request) {
        return authService.verifyOtp(request);
    }

    @PostMapping("/resend-otp")
    public ApiResponse<String> resendOtp(@RequestParam String email) {
        return authService.resendOtp(email);
    }

    @PostMapping("/forgot-password")
    public ApiResponse<String> forgotPassword(@RequestParam String email) {
        return authService.forgotPassword(email);
    }

    @PostMapping("/reset-password")
    public ApiResponse<UserDto> resetPassword(@Valid @RequestBody PasswordResetRequest request) {
        return authService.resetPassword(request);
    }

    /**
     * Test endpoint to verify email sending works correctly.
     * Generates a random OTP and sends it to the provided email.
     * For development/testing only.
     *
     * @param email recipient email address
     * @return success message
     */
    @PostMapping("/test-send-otp")
    public ApiResponse<String> testSendOtp(@RequestParam String email) {
        String testOtp = String.valueOf(100000 + (int) (Math.random() * 900000));
        try {
            mailService.sendOtp(email, testOtp);
            return ApiResponse.<String>builder()
                    .success(true)
                    .message("Test OTP sent successfully to " + email + ". OTP: " + testOtp + " (expires in 10 minutes)")
                    .build();
        } catch (Exception ex) {
            return ApiResponse.<String>builder()
                    .success(false)
                    .message("Failed to send test OTP: " + ex.getMessage())
                    .build();
        }
    }
}

