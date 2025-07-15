// src/App.js
// Este arquivo contém TODO o código do seu aplicativo Connectus,
// incluindo a configuração do Firebase, autenticação, navegação e o chat.
// AGORA COM AS NOVAS CREDENCIAIS DO PROJETO 'connectus-final-auth'.

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';

// Importações do Firebase v9+ (modular)
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithCustomToken,
  signInAnonymously
} from 'firebase/auth';
import { getFirestore, collection, query, orderBy, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Suas NOVAS credenciais do Firebase (do projeto 'connectus-final-auth')
const firebaseConfig = {
  apiKey: "AIzaSyD13dNS5_QJnE4R8QEqG2meHtLt9P2kLLU",
  authDomain: "connectus-final-auth.firebaseapp.com",
  projectId: "connectus-final-auth",
  storageBucket: "connectus-final-auth.firebasestorage.app",
  messagingSenderId: "889767039572",
  appId: "1:889767039572:web:bb2f0c82c96bebfdfc93c1"
  // measurementId: "G-L0MXM40B86" // Removido para simplificar, já que não estamos usando Analytics agora
};

// --- AuthContext (Integrado diretamente aqui) ---
const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [appId, setAppId] = useState('default-app-id-local'); // Valor padrão para desenvolvimento local

  useEffect(() => {
    // Inicializa o Firebase e obtém as instâncias de Auth e Firestore apenas uma vez
    const app = initializeApp(firebaseConfig);
    const authInstance = getAuth(app);
    const dbInstance = getFirestore(app);

    setAuth(authInstance);
    setDb(dbInstance);

    // Tenta definir o appId a partir da variável global __app_id (ambiente Canvas)
    if (typeof window !== 'undefined' && typeof window.__app_id !== 'undefined') {
      setAppId(window.__app_id);
    } else {
      // Se não estiver no Canvas, usa o projectId do firebaseConfig como appId
      // Isso é uma boa prática para ter um appId consistente localmente
      setAppId(firebaseConfig.projectId);
    }

    // Listener para mudanças no estado de autenticação do Firebase
    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      if (user) {
        setCurrentUser(user);
        setUserId(user.uid);
      } else {
        setCurrentUser(null);
        // Gera um userId anônimo para uso em Firestore se não houver usuário autenticado
        setUserId(crypto.randomUUID());
      }
      setLoading(false);
    });

    // Removido a tentativa automática de signInWithCustomToken ou signInAnonymously
    // quando rodando localmente, para evitar conflitos com o token do Canvas
    // e garantir que o login seja feito via formulário.
    return () => unsubscribe();
  }, []);

  const signup = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    signup,
    login,
    logout,
    db,
    auth,
    userId,
    appId
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// --- PrivateRoute (Integrado diretamente aqui) ---
function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div>
      </div>
    );
  }
  return currentUser ? children : <Navigate to="/login" replace />;
}

// --- Páginas (Integradas diretamente aqui) ---

// HomePage
function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-xl max-w-md w-full mx-auto my-8">
      <h1 className="text-4xl font-bold text-indigo-700 mb-4 text-center">
        Connectus
      </h1>
      <p className="text-lg text-gray-700 mb-6 text-center leading-relaxed">
        Sua plataforma de apoio para superar desafios e encontrar um novo caminho.
        Conecte-se, encontre oportunidades e seja recompensado pela sua persistência.
      </p>
      <Link
        to="/login"
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
      >
        Começar Agora
      </Link>
    </div>
  );
}

// LoginPage
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await login(email, password);
      navigate('/profile');
    } catch (err) {
      console.error("Connectus: Erro ao fazer login:", err.message);
      let errorMessage = 'Falha ao fazer login. Verifique seu email e senha.';
      if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Credenciais inválidas. Verifique seu email e senha.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado. Cadastre-se ou verifique o email.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-xl max-w-md w-full mx-auto my-8">
      <h1 className="text-3xl font-bold text-indigo-700 mb-6">Login no Connectus</h1>
      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Senha
          </label>
          <input
            type="password"
            id="password"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 w-full"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="text-gray-600 mt-6 text-center">
        Não tem uma conta?{' '}
        <Link to="/register" className="text-indigo-600 hover:underline font-medium">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}

// RegisterPage
function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      return setError('As senhas não coincidem.');
    }
    try {
      setLoading(true);
      await signup(email, password);
      navigate('/profile');
    } catch (err) {
      console.error("Connectus: Erro ao cadastrar:", err.message);
      let errorMessage = 'Falha ao criar a conta.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Formato de email inválido.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-xl max-w-md w-full mx-auto my-8">
      <h1 className="text-3xl font-bold text-indigo-700 mb-6">Cadastro no Connectus</h1>
      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Senha
          </label>
          <input
            type="password"
            id="password"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirm-password">
            Confirmar Senha
          </label>
          <input
            type="password"
            id="confirm-password"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="********"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 w-full"
        >
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </button>
      </form>
      <p className="text-gray-600 mt-6 text-center">
        Já tem uma conta?{' '}
        <Link to="/login" className="text-indigo-600 hover:underline font-medium">
          Faça login
        </Link>
      </p>
    </div>
  );
}

// VentPage
function VentPage() {
  const [ventText, setVentText] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { db, currentUser, userId, appId } = useAuth();

  const handleVentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!ventText.trim()) {
      setError('Por favor, escreva algo para desabafar.');
      return;
    }
    if (!currentUser || !userId) {
      setError('Você precisa estar logado para desabafar.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/vents`), {
        text: ventText,
        userId: userId,
        createdAt: serverTimestamp(),
      });
      console.log(`Connectus: Usuário ${userId} desabafou e ganhou 10 pontos simbólicos.`);
      setMessage('Obrigado por compartilhar! Sua voz é importante. Você ganhou 10 pontos simbólicos.');
      setVentText('');
    } catch (err) {
      console.error("Connectus: Erro ao salvar desabafo:", err);
      setError("Ocorreu um erro ao salvar seu desabafo. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-xl max-w-md w-full mx-auto my-8">
      <h1 className="text-3xl font-bold text-indigo-700 mb-4 text-center">Desabafo e Acolhimento</h1>
      <p className="text-gray-700 mb-6 text-center">
        Este é o seu espaço seguro para expressar o que sente. Escreva livremente e receba nosso acolhimento.
      </p>
      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
      {message && <p className="text-green-600 mb-4 text-center font-semibold">{message}</p>}
      <form onSubmit={handleVentSubmit} className="w-full space-y-4">
        <div>
          <label htmlFor="vent-text" className="block text-gray-700 text-sm font-bold mb-2">
            O que está sentindo?
          </label>
          <textarea
            id="vent-text"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none"
            placeholder="Escreva aqui seu desabafo..."
            value={ventText}
            onChange={(e) => setVentText(e.target.value)}
            required
            disabled={!currentUser}
          ></textarea>
        </div>
        <button
          type="submit"
          disabled={loading || !currentUser}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 w-full"
        >
          {loading ? 'Enviando...' : 'Desabafar e Receber Acolhimento'}
        </button>
      </form>
      {!currentUser && (
        <p className="text-sm text-gray-600 mt-4 text-center">Faça login para compartilhar seu desabafo.</p>
      )}
    </div>
  );
}

// CommunityPage (Chat)
function CommunityPage() {
  const { db, currentUser, userId, appId } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const offensiveWords = ['idiota', 'bobo', 'palavrão', 'ofensa', 'xingamento', 'puta', 'caralho', 'merda', 'inferno'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!db || !appId) {
      console.warn("Connectus: Firestore ou App ID não disponível para carregar mensagens.");
      return;
    }
    const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/messages`);
    const q = query(messagesCollectionRef, orderBy('createdAt'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = [];
      snapshot.forEach((doc) => {
        fetchedMessages.push({ ...doc.data(), id: doc.id });
      });
      setMessages(fetchedMessages);
      scrollToBottom();
    }, (err) => {
      console.error("Connectus: Erro ao carregar mensagens:", err);
      setError("Erro ao carregar mensagens. Tente novamente mais tarde.");
    });
    return () => unsubscribe();
  }, [db, appId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    setError('');
    if (!newMessage.trim()) {
      setError('A mensagem não pode estar vazia.');
      return;
    }
    if (!currentUser || !userId) {
      setError('Você precisa estar logado para enviar mensagens.');
      return;
    }

    let moderatedMessage = newMessage;
    offensiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      moderatedMessage = moderatedMessage.replace(regex, '***');
    });
    const anonymizedMessage = moderatedMessage
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL OCULTO]')
      .replace(/\b\d{2}\s?\d{4,5}-?\d{4}\b/g, '[NÚMERO OCULTO]');

    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/messages`), {
        text: anonymizedMessage,
        createdAt: serverTimestamp(),
        senderId: userId,
        senderAlias: `Usuário #${userId.substring(0, 6)}`,
      });
      setNewMessage('');
    } catch (err) {
      console.error("Connectus: Erro ao enviar mensagem:", err);
      setError("Erro ao enviar mensagem. Por favor, tente novamente.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto my-8 h-[70vh]">
      <h1 className="text-3xl font-bold text-indigo-700 mb-4">Comunidade Connectus (Chat Anônimo)</h1>
      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
      <div className="flex-grow w-full bg-gray-50 p-4 rounded-lg overflow-y-auto mb-4 border border-gray-200">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 mt-10">Seja o primeiro a enviar uma mensagem!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-3 p-3 rounded-lg shadow-sm ${
                msg.senderId === userId ? 'bg-indigo-100 ml-auto text-right' : 'bg-gray-200 mr-auto text-left'
              }`}
              style={{ maxWidth: '80%' }}
            >
              <p className="font-semibold text-sm text-indigo-800">{msg.senderAlias}</p>
              <p className="text-gray-800 break-words">{msg.text}</p>
              <span className="text-xs text-gray-500 mt-1 block">
                {msg.createdAt?.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="w-full flex">
        <input
          type="text"
          className="flex-grow shadow appearance-none border rounded-l-lg py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Digite sua mensagem anônima..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={!currentUser}
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-r-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
          disabled={!currentUser}
        >
          Enviar
        </button>
      </form>
      {!currentUser && (
        <p className="text-sm text-gray-600 mt-2 text-center">Faça login para participar do chat.</p>
      )}
    </div>
  );
}

// ProfilePage
function ProfilePage() {
  const { currentUser, userId } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-xl max-w-md w-full mx-auto my-8">
      <h1 className="text-3xl font-bold text-indigo-700 mb-4">Perfil do Usuário no Connectus</h1>
      {currentUser ? (
        <>
          <p className="text-gray-700 mb-2">Email: {currentUser.email}</p>
          <p className="text-gray-700 mb-4">ID de Usuário (UID): <span className="font-mono text-sm bg-gray-200 p-1 rounded">{userId}</span></p>
          <p className="text-gray-700">Seu progresso e recompensas serão exibidos aqui.</p>
        </>
      ) : (
        <p className="text-gray-700">Faça login para ver seu perfil.</p>
      )}
    </div>
  );
}

// Navbar Component
function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Connectus: Erro ao fazer logout:", error);
    }
  };

  return (
    <nav className="w-full bg-indigo-700 p-4 shadow-md flex justify-between items-center px-8">
      <Link to="/" className="text-white text-2xl font-bold hover:text-indigo-200 transition duration-200">
        Connectus
      </Link>
      <ul className="flex space-x-6 text-white text-lg font-medium">
        <li>
          <Link to="/" className="hover:text-indigo-200 transition duration-200">Home</Link>
        </li>
        {!currentUser && (
          <>
            <li>
              <Link to="/login" className="hover:text-indigo-200 transition duration-200">Login</Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-indigo-200 transition duration-200">Cadastro</Link>
            </li>
          </>
        )}
        {currentUser && (
          <>
            <li>
              <Link to="/vent" className="hover:text-indigo-200 transition duration-200">Desabafo</Link>
            </li>
            <li>
              <Link to="/community" className="hover:text-indigo-200 transition duration-200">Comunidade</Link>
            </li>
            <li>
              <Link to="/profile" className="hover:text-indigo-200 transition duration-200">Perfil</Link>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className="hover:text-indigo-200 transition duration-200 bg-transparent border-none cursor-pointer text-white text-lg font-medium"
              >
                Sair
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

// Main App Component
function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-100 flex flex-col items-center font-inter">
          <Navbar />
          <main className="flex-grow flex items-center justify-center w-full p-4">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/vent" element={<PrivateRoute><VentPage /></PrivateRoute>} />
              <Route path="/community" element={<PrivateRoute><CommunityPage /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            </Routes>
          </main>
        </div>
        {/* Tailwind CSS and Inter Font */}
        <script src="https://cdn.tailwindcss.com"></script>
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
          }
        `}} />
      </AuthProvider>
    </Router>
  );
}

export default App;
