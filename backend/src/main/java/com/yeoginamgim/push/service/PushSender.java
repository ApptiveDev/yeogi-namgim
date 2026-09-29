package com.yeoginamgim.push.service;

public interface PushSender {
	boolean isConfigured();
	DeliveryResult send(String deviceToken);
}
