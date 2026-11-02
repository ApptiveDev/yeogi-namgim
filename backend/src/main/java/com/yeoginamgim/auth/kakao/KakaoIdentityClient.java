package com.yeoginamgim.auth.kakao;

public interface KakaoIdentityClient {
    Identity verify(String accessToken, boolean includeEmail);
    record Identity(long kakaoId, String verifiedEmail) {}
}
