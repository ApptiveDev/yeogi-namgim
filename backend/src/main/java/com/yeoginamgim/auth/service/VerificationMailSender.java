package com.yeoginamgim.auth.service;

public interface VerificationMailSender {
	void sendCode(String email, String code);
}
