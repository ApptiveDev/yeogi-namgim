package com.yeoginamgim.user.dto;

import org.hibernate.validator.constraints.CodePointLength;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ProfileUpdateRequest(
	@NotBlank @CodePointLength(min = 2, max = 20)
	@Pattern(regexp = "[^\\p{Cntrl}]+", message = "닉네임에 제어 문자를 사용할 수 없습니다.") String nickname
) {
	public ProfileUpdateRequest {
		nickname = nickname == null ? null : nickname.strip();
	}
}
