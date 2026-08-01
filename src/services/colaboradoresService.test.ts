import { describe, it, expect, vi } from 'vitest';
import { listarColaboradoresElegiveis } from './colaboradoresService';

// Mock do supabaseClient
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            { id: '1', nome: 'Ana Silva', setor: 'Biomedicina', cargo: 'Biomédica' },
            { id: '2', nome: 'Carlos CEO', setor: 'Diretoria', cargo: 'CEO' },
            { id: '3', nome: 'Fernanda Rocha', setor: 'Enfermagem', cargo: 'Enfermeira' },
          ],
          error: null,
        }),
      }),
    }),
  },
}));

describe('colaboradoresService', () => {
  it('deve buscar e retornar apenas os colaboradores elegíveis', async () => {
    const colabs = await listarColaboradoresElegiveis();
    expect(colabs).toHaveLength(2);
    expect(colabs.map(c => c.nome)).toEqual(['Ana Silva', 'Fernanda Rocha']);
  });
});
