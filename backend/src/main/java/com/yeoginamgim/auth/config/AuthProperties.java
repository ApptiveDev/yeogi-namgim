package com.yeoginamgim.auth.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("auth")
public record AuthProperties(String jwtSecret, String verificationSecret, String issuer,
	Duration accessTokenTtl, String mailFrom) {
	@Override public String toString() { return "AuthProperties[REDACTED]"; }
}
