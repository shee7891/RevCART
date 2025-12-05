package com.revcart.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * Configuration to separate JPA and MongoDB repository scanning.
 * This prevents Spring Data from getting confused about which repositories
 * should use JPA vs MongoDB.
 */
@Configuration
@EnableJpaRepositories(
    basePackages = "com.revcart.repository",
    excludeFilters = @org.springframework.context.annotation.ComponentScan.Filter(
        type = org.springframework.context.annotation.FilterType.REGEX,
        pattern = "com\\.revcart\\.repository\\.mongo\\..*"
    )
)
@EnableMongoRepositories(
    basePackages = "com.revcart.repository.mongo"
)
public class DataSourceConfig {
}
