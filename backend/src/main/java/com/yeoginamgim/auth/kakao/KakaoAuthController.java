package com.yeoginamgim.auth.kakao;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import org.hibernate.validator.constraints.CodePointLength;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import com.yeoginamgim.auth.dto.AuthResponses.TokenPair;
import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.auth.CurrentUserProvider;
import com.yeoginamgim.common.rate.FixedWindowRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@RestController
@ConditionalOnExpression("${auth.enabled:false} and ${auth.kakao.enabled:false}")
public class KakaoAuthController {
    private final KakaoAuthService service;
    private final CurrentUserProvider currentUser;
    private final FixedWindowRateLimiter limiter;
    public KakaoAuthController(KakaoAuthService service, CurrentUserProvider currentUser, FixedWindowRateLimiter limiter) {
        this.service = service; this.currentUser = currentUser; this.limiter = limiter;
    }
    public record TokenRequest(@NotBlank @Size(max=4096) @Pattern(regexp="[\\x21-\\x7E]+") String accessToken) {
        @Override public String toString() { return "TokenRequest[REDACTED]"; }
    }
    public record SignupRequest(@NotBlank @Size(max=4096) @Pattern(regexp="[\\x21-\\x7E]+") String accessToken,
        @NotBlank @CodePointLength(min=2,max=20) @Pattern(regexp="[^\\p{Cntrl}]+") String nickname) {
        public SignupRequest { nickname = nickname == null ? null : nickname.strip(); }
        @Override public String toString() { return "SignupRequest[REDACTED]"; }
    }
    @PostMapping("/api/v1/auth/kakao")
    public ResponseEntity<ApiResponse<TokenPair>> login(@Valid @RequestBody TokenRequest body, HttpServletRequest request) {
        limit(request); return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.success(service.login(body.accessToken())));
    }
    @PostMapping("/api/v1/auth/kakao/signup")
    public ResponseEntity<ApiResponse<TokenPair>> signup(@Valid @RequestBody SignupRequest body, HttpServletRequest request) {
        limit(request); return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(ApiResponse.success(service.signup(body.accessToken(), body.nickname())));
    }
    @PostMapping("/api/v1/users/me/auth-accounts/kakao")
    public ResponseEntity<ApiResponse<Map<String,Boolean>>> link(@Valid @RequestBody TokenRequest body, HttpServletRequest request) {
        UUID userId = currentUser.requireUserId(); limit(request); service.link(userId, body.accessToken());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.success(Map.of("linked", true)));
    }
    private void limit(HttpServletRequest request) {
        limiter.check("kakao-auth-ip", UUID.nameUUIDFromBytes(request.getRemoteAddr().getBytes(StandardCharsets.UTF_8)), 20);
    }
}
