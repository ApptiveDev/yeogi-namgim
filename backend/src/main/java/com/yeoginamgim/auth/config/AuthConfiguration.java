package com.yeoginamgim.auth.config;

import java.time.Clock;
import java.time.Duration;
import java.util.Base64;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.yeoginamgim.auth.service.AccessTokenCodec;
import com.yeoginamgim.auth.service.VerificationCodec;
import com.yeoginamgim.auth.service.RefreshTokenCodec;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
@EnableConfigurationProperties(AuthProperties.class)
public class AuthConfiguration {
	@Bean
	Clock authClock() { return Clock.systemUTC(); }

	@Bean
	PasswordEncoder memberPasswordEncoder() { return new BCryptPasswordEncoder(12); }

	@Bean
	AccessTokenCodec accessTokenCodec(AuthProperties properties, Clock clock,
		@Value("${spring.mail.host:}") String mailHost) {
		if (mailHost.isBlank() || properties.mailFrom().isBlank()) {
			throw new IllegalStateException("회원 인증을 사용하려면 MAIL_HOST와 AUTH_MAIL_FROM을 설정해야 합니다.");
		}
		Duration ttl = properties.accessTokenTtl();
		if (ttl == null || ttl.compareTo(Duration.ofSeconds(1)) < 0 || ttl.compareTo(Duration.ofDays(1)) > 0) {
			throw new IllegalStateException("AUTH_ACCESS_TOKEN_TTL은 1초 이상 24시간 이하여야 합니다.");
		}
		return new AccessTokenCodec(secret(properties.jwtSecret(), "AUTH_JWT_SECRET"),
			properties.issuer(), ttl, clock);
	}

	@Bean
	VerificationCodec verificationCodec(AuthProperties properties) {
		return new VerificationCodec(secret(properties.verificationSecret(), "AUTH_VERIFICATION_SECRET"));
	}

	@Bean
	RefreshTokenCodec refreshTokenCodec() { return new RefreshTokenCodec(); }

	private SecretKey secret(String encoded, String name) {
		try {
			byte[] bytes = Base64.getDecoder().decode(encoded == null ? "" : encoded);
			if (bytes.length < 32) throw new IllegalArgumentException();
			return new SecretKeySpec(bytes, "HmacSHA256");
		} catch (IllegalArgumentException exception) {
			throw new IllegalStateException(name + "에 32바이트 이상의 임의 키를 Base64로 설정해야 합니다.");
		}
	}
}
