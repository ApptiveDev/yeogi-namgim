package com.yeoginamgim.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import com.yeoginamgim.auth.dto.AuthRequests.SignupRequest;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;

class AuthRequestsTests {
	private static final ValidatorFactory FACTORY = Validation.buildDefaultValidatorFactory();
	private static final String VERIFICATION_TOKEN = "v".repeat(43);

	@AfterAll
	static void closeValidator() { FACTORY.close(); }

	private SignupRequest signup(String password, String confirm) {
		return new SignupRequest(" User@Example.com ", password, confirm, " 닉네임 ", VERIFICATION_TOKEN);
	}

	@ParameterizedTest
	@NullAndEmptySource
	@ValueSource(strings = {"Ab1!abc", "abcdefgh", "12345678", "!!!!!!!!", "Abcdef12",
		"Abcdef!@", "123456!@", "Ab1! abcd", " Ab1!abcd", "Ab1!abcd\n", "가나다라Ab1!", "Ab1!abc\t"})
	void rejectsInvalidPasswords(String password) {
		assertThat(FACTORY.getValidator().validate(signup(password, password)))
			.anyMatch(violation -> violation.getPropertyPath().toString().equals("password"));
	}

	@Test
	void acceptsBothLengthBoundariesAndAllPrintableSymbols() {
		for (String password : new String[] {"Ab1!abcd", "A1!" + "a".repeat(61), "Aa1!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"}) {
			assertThat(FACTORY.getValidator().validate(signup(password, password))).isEmpty();
		}
		assertThat(FACTORY.getValidator().validate(signup("A1!" + "a".repeat(62), "A1!" + "a".repeat(62))))
			.isNotEmpty();
	}

	@Test
	void rejectsMismatchedConfirmationWithoutTrimmingPasswords() {
		assertThat(FACTORY.getValidator().validate(signup("Ab1!abcd", "Ab1!abce")))
			.anyMatch(violation -> violation.getPropertyPath().toString().equals("passwordConfirmed"));
		assertThat(signup(" Ab1!abcd", " Ab1!abcd").password()).startsWith(" ");
	}

	@Test
	void normalizesEmailAndNicknameAndRedactsSecretFields() {
		SignupRequest request = signup("Ab1!abcd", "Ab1!abcd");
		assertThat(request.email()).isEqualTo("user@example.com");
		assertThat(request.nickname()).isEqualTo("닉네임");
		assertThat(request.toString()).doesNotContain(request.password(), VERIFICATION_TOKEN);
	}
}
