package com.yeoginamgim.auth.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import com.yeoginamgim.auth.config.AuthProperties;

@Component
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class SmtpVerificationMailSender implements VerificationMailSender {
	private final JavaMailSender sender;
	private final AuthProperties properties;

	public SmtpVerificationMailSender(JavaMailSender sender, AuthProperties properties) {
		this.sender = sender;
		this.properties = properties;
	}

	@Override
	public void sendCode(String email, String code) {
		SimpleMailMessage message = new SimpleMailMessage();
		message.setFrom(properties.mailFrom());
		message.setTo(email);
		message.setSubject("[여기남김] 이메일 인증 코드");
		message.setText("인증 코드: " + code + "\n5분 안에 입력해 주세요. 요청하지 않았다면 이 메일을 무시해 주세요.");
		try {
			sender.send(message);
		} catch (MailException exception) {
			throw new AuthException(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_SEND_FAILED", "인증 메일을 발송하지 못했습니다. 잠시 후 다시 시도해 주세요.");
		}
	}
}
