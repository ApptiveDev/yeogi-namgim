package com.yeoginamgim.push.dto;

import com.yeoginamgim.push.domain.PushPlatform;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PushTokenRegisterRequest(
	@NotNull PushPlatform platform,
	@NotBlank @Size(min = 8, max = 4096) @Pattern(regexp = "\\S+") String pushToken
) {
}
