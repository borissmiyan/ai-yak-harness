import { describe, it, expectTypeOf } from 'vitest';

/**
 * 🔒 Semantic API & Contract Freeze Test Suite (Tier-4 AI Harness)
 * 
 * Пример двунаправленной фиксации типов (Type Invariants).
 * Если поле удалено, переименовано или тип изменен на несовместимый,
 * тест падает на этапе компиляции или выполнения.
 */

interface UserPayload {
    id: string;
    email: string;
    role: 'admin' | 'user';
    isActive: boolean;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
}

describe('Semantic Contract Freeze Pattern', () => {
    it('freezes UserPayload interface structure', () => {
        expectTypeOf<UserPayload['id']>().toEqualTypeOf<string>();
        expectTypeOf<UserPayload['email']>().toEqualTypeOf<string>();
        expectTypeOf<UserPayload['role']>().toEqualTypeOf<'admin' | 'user'>();
        expectTypeOf<UserPayload['isActive']>().toEqualTypeOf<boolean>();
    });

    it('freezes generic API response wrapper', () => {
        expectTypeOf<ApiResponse<UserPayload>['success']>().toEqualTypeOf<boolean>();
        expectTypeOf<ApiResponse<UserPayload>['data']>().toEqualTypeOf<UserPayload>();
    });
});
