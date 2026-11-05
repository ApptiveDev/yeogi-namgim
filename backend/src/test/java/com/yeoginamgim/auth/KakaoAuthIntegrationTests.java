package com.yeoginamgim.auth;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import com.yeoginamgim.auth.kakao.KakaoIdentityClient;
import com.yeoginamgim.auth.service.MemberSessionService;
import com.yeoginamgim.auth.service.VerificationMailSender;
import com.yeoginamgim.user.domain.Member;
import com.yeoginamgim.user.repository.MemberRepository;

@SpringBootTest(properties={"auth.enabled=true", "auth.kakao.enabled=true", "auth.kakao.app-id=123", "auth.jwt-secret=dGVzdC1qd3Qta2V5LXJlcGVhdC0zMi1ieXRlcy1vbmx5ISE=", "auth.verification-secret=dGVzdC1lbWFpbC1rZXktcmVwZWF0LTMyLWJ5dGVzLW9ubHk=", "auth.mail-from=noreply@example.test", "spring.mail.host=localhost"})
@Transactional
class KakaoAuthIntegrationTests {
 @Autowired WebApplicationContext context;
 @Autowired MemberRepository members;
 @Autowired MemberSessionService sessions;
 @MockitoBean KakaoIdentityClient kakao;
 @MockitoBean VerificationMailSender mail;
 @Test void signupLoginAndExplicitLinking() throws Exception {
  var mvc=MockMvcBuilders.webAppContextSetup(context).build();
  var user=members.saveAndFlush(new Member(UUID.randomUUID(),"existing@example.test","hash","기존회원",Instant.now()));
  var other=members.saveAndFlush(new Member(UUID.randomUUID(),"other@example.test","hash","다른회원",Instant.now()));
  when(kakao.verify("new",true)).thenReturn(new KakaoIdentityClient.Identity(100L,"new@example.test"));
  when(kakao.verify("new",false)).thenReturn(new KakaoIdentityClient.Identity(100L,null));
  mvc.perform(post("/api/v1/auth/kakao/signup").contentType(MediaType.APPLICATION_JSON).content("{\"accessToken\":\"new\",\"nickname\":\"테스트\"}"))
   .andExpect(status().isCreated()).andExpect(jsonPath("$.data.accessToken").isNotEmpty());
  mvc.perform(post("/api/v1/auth/kakao").contentType(MediaType.APPLICATION_JSON).content("{\"accessToken\":\"new\"}")).andExpect(status().isOk());
  mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"new@example.test\",\"password\":\"anything\"}")).andExpect(status().isUnauthorized());
  when(kakao.verify("old",true)).thenReturn(new KakaoIdentityClient.Identity(200L,"existing@example.test"));
  when(kakao.verify("old",false)).thenReturn(new KakaoIdentityClient.Identity(200L,null));
  mvc.perform(post("/api/v1/auth/kakao/signup").contentType(MediaType.APPLICATION_JSON).content("{\"accessToken\":\"old\",\"nickname\":\"테스트\"}")).andExpect(status().isConflict());
  String body="{\"accessToken\":\"old\"}";
  mvc.perform(post("/api/v1/users/me/auth-accounts/kakao").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
  mvc.perform(post("/api/v1/users/me/auth-accounts/kakao").header("Authorization","Bearer "+sessions.open(user.getId()).accessToken()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
  mvc.perform(post("/api/v1/users/me/auth-accounts/kakao").header("Authorization","Bearer "+sessions.open(other.getId()).accessToken()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict());
 }
}
