# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Discord bot built with NestJS and Necord (a NestJS Discord library wrapper). The bot implements slash commands using Discord.js v14.

## Architecture

- **Framework**: NestJS with Necord for Discord integration
- **Entry Point**: `src/main.ts` - Creates a NestJS application context
- **Module Structure**: 
  - `src/app.module.ts` - Root module that configures Necord with Discord token and intents
  - `src/app.commands.ts` - Injectable service containing slash command handlers
  - `src/dtos/` - Data transfer objects for command validation

## Environment Setup

Required environment variables:
- `DISCORD_TOKEN` - Discord bot token
- `DEV_GUILD` - Development guild ID for testing commands

## Common Commands

### Development
```bash
npm run start:dev    # Start in watch mode
npm run start:debug  # Start with debugging enabled
npm run build        # Build the project
npm run lint         # Run ESLint with auto-fix
npm run format       # Format code with Prettier
```

### Production
```bash
npm run build        # Build first
npm run start:prod   # Start production server
```

## Code Patterns

### Adding Slash Commands
1. Create command handler method in `AppCommands` class
2. Use `@SlashCommand()` decorator with name and description
3. Access interaction context with `@Context() [interaction]: SlashCommandContext`
4. Use `@Options()` with DTO class for command parameters

### Command Options
- Create DTO classes in `src/dtos/` directory
- Use Necord decorators like `@StringOption()` for type validation
- DTOs define the command's input parameters and validation rules

## Configuration Notes

- ESLint configured with TypeScript support and Prettier integration
- Several TypeScript strict rules are disabled in ESLint config
- Uses pnpm for package management
- No test framework currently configured