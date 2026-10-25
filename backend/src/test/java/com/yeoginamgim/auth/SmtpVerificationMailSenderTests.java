package com.yeoginamgim.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Properties;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import com.yeoginamgim.auth.config.AuthProperties;
import com.yeoginamgim.auth.service.AuthException;
import com.yeoginamgim.auth.service.SmtpVerificationMailSender;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

class SmtpVerificationMailSenderTests {
	private final AuthProperties properties = new AuthProperties("", "", "yeogi-namgim",
		Duration.ofMinutes(15), "noreply@example.test");

	@Test
	void deliversUtf8VerificationEmailToLocalSmtpServer() throws Exception {
		try (ServerSocket server = new ServerSocket(0, 1, InetAddress.getLoopbackAddress());
			var executor = Executors.newSingleThreadExecutor()) {
			server.setSoTimeout(5000);
			var received = executor.submit(() -> {
				try (var socket = server.accept()) {
					socket.setSoTimeout(5000);
					var reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
					var writer = new PrintWriter(socket.getOutputStream(), true, StandardCharsets.UTF_8);
					writer.println("220 localhost SMTP test");
					StringBuilder data = new StringBuilder();
					boolean readingData = false;
					String line;
					while ((line = reader.readLine()) != null) {
						if (readingData) {
							if (line.equals(".")) { readingData = false; writer.println("250 Accepted"); }
							else data.append(line).append("\r\n");
						} else if (line.equals("DATA")) {
							readingData = true;
							writer.println("354 Send message");
						} else if (line.equals("QUIT")) {
							writer.println("221 Bye");
							break;
						} else writer.println("250 OK");
					}
					return data.toString();
				}
			});
			JavaMailSenderImpl transport = new JavaMailSenderImpl();
			transport.setHost(server.getInetAddress().getHostAddress());
			transport.setPort(server.getLocalPort());
			transport.setDefaultEncoding("UTF-8");
			transport.getJavaMailProperties().setProperty("mail.smtp.connectiontimeout", "5000");
			transport.getJavaMailProperties().setProperty("mail.smtp.timeout", "5000");
			new SmtpVerificationMailSender(transport, properties).sendCode("recipient@example.test", "123456");
			MimeMessage message = new MimeMessage(Session.getInstance(new Properties()),
				new ByteArrayInputStream(received.get(5, TimeUnit.SECONDS).getBytes(StandardCharsets.UTF_8)));
			assertThat(message.getFrom()[0].toString()).isEqualTo("noreply@example.test");
			assertThat(message.getAllRecipients()[0].toString()).isEqualTo("recipient@example.test");
			assertThat(message.getSubject()).contains("여기남김");
			assertThat(message.getContent().toString()).contains("123456", "5분");
		}
	}

	@Test
	void convertsTransportFailureToGenericUnavailableError() {
		JavaMailSender transport = mock(JavaMailSender.class);
		doThrow(new MailSendException("private transport details")).when(transport).send(any(SimpleMailMessage.class));
		assertThatThrownBy(() -> new SmtpVerificationMailSender(transport, properties).sendCode("user@example.test", "123456"))
			.isInstanceOfSatisfying(AuthException.class, exception -> {
				assertThat(exception.getStatus().value()).isEqualTo(503);
				assertThat(exception.getCode()).isEqualTo("EMAIL_SEND_FAILED");
				assertThat(exception.getMessage()).doesNotContain("private", "123456");
			});
	}
}
