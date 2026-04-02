package com.cisco.wxcc.ccai.ui;

/*
 * Webex Contact Center OAuth2 login sample (Spring Boot 3).
 *
 * Demonstrates authorization_code login against Webex APIs and exposes /userinfo
 * with a bearer access token for calling WxCC APIs. Not production-hardened: no
 * token persistence, refresh, or multi-tenant isolation.
 *
 * Required environment variables: WXCC_OAUTH_CLIENT_ID, WXCC_OAUTH_CLIENT_SECRET.
 * See env.template in the Gradle project root for optional variables and defaults.
 */

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;




@SpringBootApplication
@ComponentScan(basePackages = "com")
public class WebexccApplication {

	public static void main(String[] args) {
		SpringApplication.run(WebexccApplication.class, args);
	}

}

