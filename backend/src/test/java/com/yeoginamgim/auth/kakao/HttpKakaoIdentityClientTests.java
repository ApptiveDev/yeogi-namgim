package com.yeoginamgim.auth.kakao;

import static org.assertj.core.api.Assertions.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import com.yeoginamgim.auth.service.AuthException;

class HttpKakaoIdentityClientTests {
 @Test void checksAppIdentityExpiryAndVerifiedEmailAgainstProvider() throws Exception {
  var info = new AtomicReference<>("{\"id\":42,\"app_id\":123,\"expires_in\":60}");
  var user = new AtomicReference<>("{\"id\":42,\"kakao_account\":{\"is_email_valid\":true,\"is_email_verified\":true,\"email\":\"A@example.test\"}}");
  var server = HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
  for (var entry : java.util.Map.of("/info",info,"/user",user).entrySet()) server.createContext(entry.getKey(), exchange -> {
   byte[] bytes=entry.getValue().get().getBytes(StandardCharsets.UTF_8);
   exchange.sendResponseHeaders(200,bytes.length); exchange.getResponseBody().write(bytes); exchange.close();
  });
  server.start();
  try {
   String root="http://127.0.0.1:"+server.getAddress().getPort();
   var client=new HttpKakaoIdentityClient(123,root+"/info",root+"/user");
   assertThat(client.verify("secret",true)).isEqualTo(new KakaoIdentityClient.Identity(42,"a@example.test"));
   info.set("{\"id\":42,\"app_id\":999,\"expires_in\":60}");
   assertThatThrownBy(() -> client.verify("secret",false)).isInstanceOf(AuthException.class);
   info.set("{\"id\":42,\"app_id\":123,\"expires_in\":0}");
   assertThatThrownBy(() -> client.verify("secret",false)).isInstanceOf(AuthException.class);
   info.set("{\"id\":42,\"app_id\":123,\"expires_in\":60}");
   user.set("{\"id\":42,\"kakao_account\":{\"is_email_valid\":true,\"is_email_verified\":false,\"email\":\"a@example.test\"}}");
   assertThatThrownBy(() -> client.verify("secret",true)).isInstanceOf(AuthException.class);
  } finally { server.stop(0); }
 }
}
