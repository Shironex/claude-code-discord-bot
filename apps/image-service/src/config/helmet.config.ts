import { ConfigService } from '@nestjs/config';

/**
 * Creates Helmet security configuration based on environment variables
 * Supports Swagger/Scalar documentation tools with appropriate CSP directives
 */
export const createHelmetConfig = (configService: ConfigService) => {
	const isDevelopment = configService.get<string>('NODE_ENV', 'development') === 'development';
	const enableSwagger = configService.get<string>('ENABLE_SWAGGER') === 'true' || isDevelopment;
	const enableScalar = configService.get<string>('ENABLE_SCALAR') === 'true' || isDevelopment;

	// Base CSP directives
	const baseCspDirectives = {
		defaultSrc: ["'self'"],
		scriptSrc: ["'self'"],
		styleSrc: ["'self'", "'unsafe-inline'"],
		imgSrc: ["'self'", 'data:', 'blob:'],
		connectSrc: ["'self'"],
		fontSrc: ["'self'"],
		objectSrc: ["'none'"],
		mediaSrc: ["'self'"],
		frameSrc: ["'self'"],
	};

	// Add documentation tool CSP allowances if enabled
	if (enableSwagger || enableScalar) {
		// Allow CDN resources for Swagger/Scalar UI
		baseCspDirectives.scriptSrc.push('https://cdn.jsdelivr.net');
		baseCspDirectives.styleSrc.push('https://cdn.jsdelivr.net');
		baseCspDirectives.connectSrc.push('https://cdn.jsdelivr.net');
		baseCspDirectives.fontSrc.push('https://cdn.jsdelivr.net');

		// Scalar-specific allowances
		if (enableScalar) {
			baseCspDirectives.connectSrc.push('https://fonts.scalar.com');
			baseCspDirectives.fontSrc.push('https://fonts.scalar.com');
		}
	}

	return {
		contentSecurityPolicy: {
			directives: baseCspDirectives,
		},
		// Disable COEP when documentation is enabled to avoid blocking resources
		crossOriginEmbedderPolicy: !enableSwagger && !enableScalar && !isDevelopment,
		crossOriginOpenerPolicy: { policy: 'same-origin' as const },
		crossOriginResourcePolicy: { policy: 'cross-origin' as const },
		dnsPrefetchControl: { allow: false },
		frameguard: { action: 'deny' as const },
		hidePoweredBy: true,
		hsts: {
			maxAge: parseInt(configService.get<string>('HSTS_MAX_AGE', '31536000'), 10), // 1 year default
			includeSubDomains: configService.get<string>('HSTS_INCLUDE_SUBDOMAINS') !== 'false',
			preload: configService.get<string>('HSTS_PRELOAD') !== 'false',
		},
		ieNoOpen: true,
		noSniff: true,
		originAgentCluster: true,
		permittedCrossDomainPolicies: false,
		referrerPolicy: {
			policy: [configService.get<string>('REFERRER_POLICY', 'no-referrer') as 'no-referrer'],
		},
		xssFilter: true,
	};
};
