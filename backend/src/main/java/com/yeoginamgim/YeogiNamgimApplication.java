package com.yeoginamgim;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class YeogiNamgimApplication {

	public static void main(String[] args) {
		SpringApplication.run(YeogiNamgimApplication.class, args);
	}

}
