package com.yeoginamgim.auth.kakao;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import com.yeoginamgim.auth.service.AuthException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Component
@ConditionalOnExpression("${auth.enabled:false} and ${auth.kakao.enabled:false}")
public class HttpKakaoIdentityClient implements KakaoIdentityClient {
    private final long appId;
    private final String infoUrl;
    private final String userUrl;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private final JsonMapper mapper = JsonMapper.builder().build();
    @org.springframework.beans.factory.annotation.Autowired
    public HttpKakaoIdentityClient(@Value("${auth.kakao.app-id:0}") long appId) {
        this(appId, "https://kapi.kakao.com/v1/user/access_token_info", "https://kapi.kakao.com/v2/user/me");
    }
    HttpKakaoIdentityClient(long appId, String infoUrl, String userUrl) {
        if (appId <= 0) throw new IllegalStateException("KAKAO_APP_ID must be a positive numeric app ID");
        this.appId = appId; this.infoUrl = infoUrl; this.userUrl = userUrl;
    }
    @Override public Identity verify(String token, boolean includeEmail) {
        JsonNode info = get(infoUrl, token);
        if (!info.hasNonNull("id") || !info.hasNonNull("app_id") || !info.hasNonNull("expires_in")
            || info.get("id").asLong() <= 0 || info.get("app_id").asLong() != appId || info.get("expires_in").asLong() <= 0)
            throw AuthException.unauthorized();
        long id = info.get("id").asLong();
        if (!includeEmail) return new Identity(id, null);
        JsonNode user = get(userUrl, token);
        JsonNode account = user.path("kakao_account");
        if (user.path("id").asLong() != id || !account.path("is_email_valid").asBoolean(false)
            || !account.path("is_email_verified").asBoolean(false) || !account.hasNonNull("email"))
            throw new AuthException(HttpStatus.BAD_REQUEST, "KAKAO_EMAIL_REQUIRED", "인증된 카카오 이메일 제공 동의가 필요합니다.");
        String email = account.get("email").asText().strip().toLowerCase(Locale.ROOT);
        if (email.isEmpty() || email.length() > 254 || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            throw new AuthException(HttpStatus.BAD_REQUEST, "KAKAO_EMAIL_REQUIRED", "인증된 카카오 이메일이 필요합니다.");
        return new Identity(id, email);
    }
    private JsonNode get(String url, String token) {
        try {
            var request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(5))
                .header("Authorization", "Bearer " + token).GET().build();
            var response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 401 || response.statusCode() == 403) throw AuthException.unauthorized();
            if (response.statusCode() != 200) throw unavailable();
            return mapper.readTree(response.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); throw unavailable();
        } catch (java.io.IOException | IllegalArgumentException e) { throw unavailable(); }
    }
    private AuthException unavailable() { return new AuthException(HttpStatus.SERVICE_UNAVAILABLE, "KAKAO_UNAVAILABLE", "카카오 인증을 사용할 수 없습니다."); }
}
