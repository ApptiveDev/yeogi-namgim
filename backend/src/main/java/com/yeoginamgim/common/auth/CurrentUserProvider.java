package com.yeoginamgim.common.auth;

import java.util.UUID;

public interface CurrentUserProvider {
	UUID requireUserId();
}
