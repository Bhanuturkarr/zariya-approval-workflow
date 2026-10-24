package com.zariya.workflow.service;

import com.zariya.workflow.domain.AlertRecord;
import com.zariya.workflow.domain.ApplicationRecord;
import org.springframework.core.env.Environment;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Arrays;

@Service
public class EmailNotificationService {
    private final Environment environment;
    private final JavaMailSender mailSender;

    public EmailNotificationService(Environment environment, JavaMailSender mailSender) {
        this.environment = environment;
        this.mailSender = mailSender;
    }

    public void sendDeadlineAlert(ApplicationRecord application, AlertRecord alert) {
        if (!Boolean.parseBoolean(environment.getProperty("zariya.notifications.email.enabled", "false"))) return;
        String from = environment.getProperty("zariya.notifications.email.from", "").trim();
        String recipients = environment.getProperty("zariya.notifications.email.recipients", "").trim();
        if (from.isEmpty() || recipients.isEmpty()) {
            throw new IllegalStateException("Email alerts are enabled but sender or recipient addresses are missing.");
        }

        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(Arrays.stream(recipients.split(",")).map(String::trim).filter(value -> !value.isEmpty()).toArray(String[]::new));
        message.setSubject("Zariya alert: " + alert.getTitle());
        message.setText("An approval workflow needs attention.\n\n"
                + "Case: " + application.getCaseId() + "\n"
                + "Institution: " + application.getInstitution() + "\n"
                + "Region: " + application.getRegion() + "\n"
                + "Assigned to: " + application.getOwner() + "\n"
                + "Deadline: " + application.getDueDate() + "\n"
                + "Alert: " + alert.getTitle() + "\n"
                + alert.getTimeLabel() + "\n\n"
                + "This alert is also available in the Zariya dashboard.");
        mailSender.send(message);
    }
}
