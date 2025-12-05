package com.revcart;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication(exclude = {RedisAutoConfiguration.class})
@EnableCaching
@EnableJpaAuditing
public class RevCartApplication {

    public static void main(String[] args) {
        SpringApplication.run(RevCartApplication.class, args);
    }
}


