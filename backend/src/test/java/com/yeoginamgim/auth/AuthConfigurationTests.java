package com.yeoginamgim.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import com.yeoginamgim.auth.config.AuthConfiguration;
import com.yeoginamgim.auth.service.AccessTokenCodec;

class AuthConfigurationTests {
	private final ApplicationContextRunner runner = new ApplicationContextRunner()
		.withUserConfiguration(AuthConfiguration.class);

	@Test
	void disabledAuthenticationNeedsNoSecrets() {
		runner.withPropertyValues("auth.enabled=false").run(context -> {
			assertThat(context).hasNotFailed().doesNotHaveBean(AccessTokenCodec.class);
		});
	}

	@Test
	void enabledAuthenticationRejectsMissingOrShortSigningKey() {
		for (String key : new String[] {"", "c2hvcnQ="}) {
			runner.withPropertyValues("auth.enabled=true", "spring.mail.host=localhost",
				"auth.mail-from=noreply@example.test", "auth.issuer=yeogi-namgim",
				"auth.access-token-ttl=15m", "auth.jwt-secret=" + key).run(context -> {
					assertThat(context).hasFailed();
					assertThat(context.getStartupFailure()).hasRootCauseMessage(
						"AUTH_JWT_SECRET에 32바이트 이상의 임의 키를 Base64로 설정해야 합니다.");
				});
		}
	}
}
