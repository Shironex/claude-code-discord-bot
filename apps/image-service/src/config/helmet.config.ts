import { registerAs } from '@nestjs/config';

export interface HelmetConfig {
	contentSecurityPolicy: {
		directives: {
			defaultSrc: string[];
			scriptSrc: string[];
			styleSrc: string[];
			imgSrc: string[];
			connectSrc: string[];
			fontSrc: string[];
			objectSrc: string[];
			mediaSrc: string[];
			frameSrc: string[];
		};
	};
	crossOriginEmbedderPolicy: boolean;
	crossOriginOpenerPolicy: { policy: string };
	crossOriginResourcePolicy: { policy: string };
	dnsPrefetchControl: { allow: boolean };
	frameguard: { action: string };
	hidePoweredBy: boolean;
	hsts: {
		maxAge: number;
		includeSubDomains: boolean;
		preload: boolean;
	};
	ieNoOpen: boolean;
	noSniff: boolean;
	originAgentCluster: boolean;
	permittedCrossDomainPolicies: boolean;
	referrerPolicy: { policy: string[] };
	xssFilter: boolean;
}

export default registerAs('helmet', (): HelmetConfig => {
	const isDevelopment = process.env.NODE_ENV === 'development';

	return {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", 'data:', 'blob:'],
				connectSrc: ["'self'"],
				fontSrc: ["'self'"],
				objectSrc: ["'none'"],
				mediaSrc: ["'self'"],
				frameSrc: ["'none'"],
			},
		},
		crossOriginEmbedderPolicy: !isDevelopment,
		crossOriginOpenerPolicy: { policy: 'same-origin' },
		crossOriginResourcePolicy: { policy: 'cross-origin' },
		dnsPrefetchControl: { allow: false },
		frameguard: { action: 'deny' },
		hidePoweredBy: true,
		hsts: {
			maxAge: 31536000, // 1 year
			includeSubDomains: true,
			preload: true,
		},
		ieNoOpen: true,
		noSniff: true,
		originAgentCluster: true,
		permittedCrossDomainPolicies: false,
		referrerPolicy: { policy: ['no-referrer'] },
		xssFilter: true,
	};
});
