package com.yeoginamgim;

import java.time.Instant;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Component;
import com.yeoginamgim.guest.domain.GuestSession;
import com.yeoginamgim.guest.repository.GuestSessionRepository;

/** Creates historical rows to verify retirement and data isolation. Test sources only. */
@Component
public class LegacyGuestFixtures {
    private final GuestSessionRepository guests;
    public LegacyGuestFixtures(GuestSessionRepository guests) { this.guests = guests; }
    public Guest create() {
        UUID id = UUID.randomUUID();
        byte[] random = new byte[32];
        new SecureRandom().nextBytes(random);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        try {
            String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(token.getBytes(StandardCharsets.UTF_8)));
            guests.saveAndFlush(GuestSession.create(id, hash, Instant.now()));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
        return new Guest(id, token);
    }
    public record Guest(UUID guestId, String guestToken) {}
}
