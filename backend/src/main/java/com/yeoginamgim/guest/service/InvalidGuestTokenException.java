package com.yeoginamgim.guest.service;

public class InvalidGuestTokenException extends RuntimeException {
	public InvalidGuestTokenException() {
		super("Invalid guest token");
	}
}

