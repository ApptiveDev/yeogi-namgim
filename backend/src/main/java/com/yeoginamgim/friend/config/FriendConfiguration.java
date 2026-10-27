package com.yeoginamgim.friend.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
@EnableConfigurationProperties(FriendProperties.class)
public class FriendConfiguration {}
