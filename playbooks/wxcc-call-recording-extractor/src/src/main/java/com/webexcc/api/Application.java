package com.webexcc.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Webex Contact Center sample: exports call recordings using the documented
 * Capture API (https://developer.webex.com/webex-contact-center/docs/api/v1/captures).
 * <p>
 * Demonstration code only — not production-hardened. Set OAuth and API values via
 * environment variables (see env.template and application.properties /
 * application.yml in src/main/resources).
 * </p>
 */
@SpringBootApplication
@EnableScheduling
public class Application {

	public static void main(String[] args) {
		SpringApplication.run(Application.class, args);
	}

}
