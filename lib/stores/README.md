# Workspace Store (Zustand)

Este store gerencia o estado global de workspaces e files usando Zustand.

## Uso

### Hook básico para sincronizar

```tsx
import { useSyncFiles } from "@/lib/hooks/useSyncFiles";

function MyComponent() {
  const { syncFiles, isSyncing, error, lastSyncAt } = useSyncFiles();

  // Sincroniza automaticamente quando o componente monta
  // Você também pode chamar manualmente:
  // syncFiles();

  return (
    <div>
      {isSyncing && <p>Sincronizando...</p>}
      {error && <p>Erro: {error}</p>}
      {lastSyncAt && <p>Última sincronização: {lastSyncAt.toLocaleString()}</p>}
    </div>
  );
}
```

### Hook para acessar dados

```tsx
import { useWorkspaceData } from "@/lib/hooks/useSyncFiles";

function MyComponent() {
  const {
    workspaces,
    files,
    getFilesByWorkspace,
    getFileById,
    getWorkspaceById,
  } = useWorkspaceData();

  const workspaceFiles = getFilesByWorkspace("workspace-001");
  const file = getFileById("file-001");
  const workspace = getWorkspaceById("workspace-001");

  return (
    <div>
      <p>Workspaces: {workspaces.length}</p>
      <p>Files: {files.length}</p>
    </div>
  );
}
```

### Acesso direto ao store

```tsx
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";

function MyComponent() {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const files = useWorkspaceStore((state) => state.files);
  const syncFiles = useWorkspaceStore((state) => state.syncFiles);

  return <button onClick={syncFiles}>Sincronizar</button>;
}
```

## API

### Estado

- `workspaces: Folder[]` - Lista de workspaces
- `files: FolderItem[]` - Lista de todos os files
- `isLoading: boolean` - Se está carregando
- `isSyncing: boolean` - Se está sincronizando
- `lastSyncAt: Date | null` - Data da última sincronização
- `error: string | null` - Mensagem de erro

### Ações

- `syncFiles()` - Sincroniza todos os workspaces e files do usuário
- `setWorkspaces(workspaces)` - Define workspaces manualmente
- `setFiles(files)` - Define files manualmente
- `setSyncData(data)` - Define dados de sincronização
- `clearError()` - Limpa o erro
- `reset()` - Reseta o store

### Getters

- `getFilesByWorkspace(workspaceId)` - Retorna files de um workspace
- `getFileById(fileId)` - Retorna um file por ID
- `getWorkspaceById(workspaceId)` - Retorna um workspace por ID

## Persistência

O store usa `persist` middleware do Zustand para salvar dados no `localStorage` automaticamente. Os dados são restaurados quando a aplicação recarrega.
