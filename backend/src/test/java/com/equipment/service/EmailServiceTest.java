package com.equipment.service;

import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EmailServiceTest {
    private JavaMailSender sender;
    private EmailService service;

    @BeforeEach
    void setUp() {
        sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenAnswer(invocation ->
                new MimeMessage(Session.getInstance(new Properties())));
        service = new EmailService(sender);
        ReflectionTestUtils.setField(service, "frontendUrl", "https://mawrid.example");
        ReflectionTestUtils.setField(service, "fromEmail", "no-reply@mawrid.example");
        ReflectionTestUtils.setField(service, "smtpApiKey", "configured-for-test");
        service.validateEmailConfiguration();
    }

    @Test
    void allTransactionalEmailFlowsBuildAndSendMessages() {
        service.sendVerificationOtpEmailBlocking("student@example.com", "123456");
        service.sendOtpEmailBlocking("student@example.com", "654321");
        service.sendTemporaryPasswordEmailBlocking("student@example.com", "Student", "Temp-1234");

        verify(sender, times(3)).send(any(MimeMessage.class));
    }

    @Test
    void verificationEmailContainsRecipientAndSubject() throws Exception {
        service.sendVerificationOtpEmailBlocking("student@example.com", "123456");

        var captor = org.mockito.ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(captor.capture());
        MimeMessage message = captor.getValue();
        assertEquals("Verify Your Mawrid Account", message.getSubject());
        assertEquals("student@example.com", message.getRecipients(Message.RecipientType.TO)[0].toString());
    }

    @Test
    void missingSmtpConfigurationFailsClearly() {
        ReflectionTestUtils.setField(service, "smtpApiKey", "");
        service.validateEmailConfiguration();

        assertThrows(IllegalStateException.class,
                () -> service.sendOtpEmailBlocking("student@example.com", "123456"));
        verify(sender, never()).send(any(MimeMessage.class));
    }
}
