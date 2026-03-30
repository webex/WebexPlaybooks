package com.webexcc.api;

/**
 * Spring Boot entry point for the WxCC GraphQL → Power BI connector sample. Configuration
 * is supplied via environment variables bound in {@code application.properties}.
 */
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling

public class Application {
	public static void main(String[] args) {
		SpringApplication.run(Application.class, args);
	}
}
