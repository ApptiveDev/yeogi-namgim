package com.yeoginamgim.push.dto;

import jakarta.validation.constraints.NotNull;

public record PushTokenStatusRequest(@NotNull Boolean enabled) {
}
