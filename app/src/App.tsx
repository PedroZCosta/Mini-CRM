import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/contexto';
import { Layout } from './componentes/Layout';
import { ToastProvider } from './componentes/Toast';
import { AlteracoesProvider } from './estado/AlteracoesProvider';
import { Clientes } from './paginas/Clientes';
import { ClienteDetalhe } from './paginas/ClienteDetalhe';
import { Dashboard } from './paginas/Dashboard';
import { Funil } from './paginas/Funil';
import { Login } from './paginas/Login';

/** Sem sessão, qualquer rota cai no login (RF02 — rotas protegidas). */
function Rotas() {
  const { sessao } = useAuth();

  if (!sessao) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<ClienteDetalhe />} />
        <Route path="/funil" element={<Funil />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AlteracoesProvider>
          <ToastProvider>
            <Rotas />
          </ToastProvider>
        </AlteracoesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
