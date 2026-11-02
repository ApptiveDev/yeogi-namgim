package com.yeoginamgim.auth;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import com.yeoginamgim.auth.kakao.KakaoIdentityClient;
import static org.assertj.core.api.Assertions.assertThat;
@SpringBootTest(properties={"auth.enabled=true", "auth.kakao.enabled=true", "auth.kakao.app-id=123", "auth.jwt-secret=dGVzdC1qd3Qta2V5LXJlcGVhdC0zMi1ieXRlcy1vbmx5ISE=", "auth.verification-secret=dGVzdC1lbWFpbC1rZXktcmVwZWF0LTMyLWJ5dGVzLW9ubHk=", "auth.mail-from=noreply@example.test", "spring.mail.host=localhost"})
class KakaoConfigurationIntegrationTests {
 @Autowired KakaoIdentityClient client;
 @Test void realProviderBeanStartsWhenEnabled() { assertThat(client).isNotNull(); }
}
