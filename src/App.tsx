import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar, ReferenceLine, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Plus, X, Eye, EyeOff, BarChart3, Bell, Clock, Trash2, Download, Zap, Activity } from 'lucide-react';

// Funciones de indicadores técnicos
const calculateRSI = (prices, period = 14) => {
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  let gains = 0, losses = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) gains += changes[i];
    else losses += Math.abs(changes[i]);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  const rsiValues = [];

  for (let i = period; i < changes.length; i++) {
    if (changes[i] > 0) gains = changes[i];
    else gains = 0;
    if (changes[i] < 0) losses = Math.abs(changes[i]);
    else losses = 0;

    avgGain = (avgGain * (period - 1) + gains) / period;
    avgLoss = (avgLoss * (period - 1) + losses) / period;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    rsiValues.push(isNaN(rsi) ? 50 : rsi);
  }

  return rsiValues;
};

const calculateMACD = (prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    let ema = data[0];
    const result = [ema];
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
      result.push(ema);
    }
    return result;
  };

  const fastEMA = ema(prices, fastPeriod);
  const slowEMA = ema(prices, slowPeriod);
  const macdLine = fastEMA.map((val, i) => val - slowEMA[i]);
  const signalLine = ema(macdLine, signalPeriod);

  return { macdLine, signalLine };
};

const calculateBollingerBands = (prices, period = 20, stdDev = 2) => {
  const bands = [];
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b) / period;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const std = Math.sqrt(variance);

    bands.push({
      middle: mean,
      upper: mean + std * stdDev,
      lower: mean - std * stdDev
    });
  }
  return bands;
};

const AdvancedTradingApp = () => {
  const [activeTab, setActiveTab] = useState('trading');
  const [brokerConnected, setBrokerConnected] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState('MetaTrader5');
  const [price, setPrice] = useState(4374.256);
  const [entryPrice, setEntryPrice] = useState(4374.256);
  const [takeProfitPrice, setTakeProfitPrice] = useState(4396.563);
  const [stopLossPrice, setStopLossPrice] = useState(4360);
  const [riskType, setRiskType] = useState('fixed-risk');
  const [riskAmount, setRiskAmount] = useState(50);
  const [lots, setLots] = useState(0.06);
  const [balance, setBalance] = useState(10000);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [operationHistory, setOperationHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [selected, setSelected] = useState('XAU/USD');
  const [alerts, setAlerts] = useState([]);
  const [alertPrice, setAlertPrice] = useState(4380);
  const [supportResistance, setSupportResistance] = useState({ support: 0, resistance: 0, pivot: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [backtest, setBacktest] = useState({ running: false, results: null });
  const [indicators, setIndicators] = useState({ rsi: [], macd: null, bollinger: [] });
  const [priceHistory, setPriceHistory] = useState([]);
  const priceHistoryRef = useRef([]);

  // Actualizar hora
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cargar datos guardados
  useEffect(() => {
    const saved = localStorage.getItem('tradingHistory');
    if (saved) setOperationHistory(JSON.parse(saved));
    const savedPos = localStorage.getItem('positions');
    if (savedPos) setPositions(JSON.parse(savedPos));
  }, []);

  // Generar datos de gráfico y calcular indicadores
  useEffect(() => {
    const data = [];
    let basePrice = 4350;
    const prices = [];

    for (let i = 0; i < 150; i++) {
      const change = (Math.random() - 0.48) * 8;
      basePrice += change;
      prices.push(basePrice);
      data.push({
        time: i,
        price: parseFloat(basePrice.toFixed(2))
      });
    }

    // Calcular niveles
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const close = prices[prices.length - 1];
    const pivot = (high + low + close) / 3;
    const support = (pivot * 2) - high;
    const resistance = (pivot * 2) - low;

    setSupportResistance({ support, resistance, pivot });
    setPriceHistory(prices);
    priceHistoryRef.current = prices;
    setPrice(parseFloat(basePrice.toFixed(3)));

    // Calcular indicadores
    const rsiValues = calculateRSI(prices);
    const macdData = calculateMACD(prices);
    const bollingerBands = calculateBollingerBands(prices);

    const enrichedData = data.map((d, i) => ({
      ...d,
      rsi: i >= prices.length - rsiValues.length ? rsiValues[i - (prices.length - rsiValues.length)] : null,
      macd: i >= prices.length - macdData.macdLine.length ? macdData.macdLine[i - (prices.length - macdData.macdLine.length)] : null,
      signal: i >= prices.length - macdData.signalLine.length ? macdData.signalLine[i - (prices.length - macdData.signalLine.length)] : null,
      bollUpper: i >= prices.length - bollingerBands.length ? bollingerBands[i - (prices.length - bollingerBands.length)]?.upper : null,
      bollMiddle: i >= prices.length - bollingerBands.length ? bollingerBands[i - (prices.length - bollingerBands.length)]?.middle : null,
      bollLower: i >= prices.length - bollingerBands.length ? bollingerBands[i - (prices.length - bollingerBands.length)]?.lower : null,
    }));

    setChartData(enrichedData);
    setIndicators({ rsi: rsiValues, macd: macdData, bollinger: bollingerBands });
  }, []);

  // Solicitar permiso de notificaciones
  const requestNotifications = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          new Notification('Trading App', {
            body: '✅ Notificaciones activadas. Recibirás alertas en tiempo real.',
            icon: '📊'
          });
        }
      });
    }
  };

  // Enviar notificación
  const sendNotification = (title, options) => {
    if (notificationsEnabled && 'Notification' in window) {
      new Notification(title, options);
    }
  };

  // Conectar a broker
  const connectBroker = async () => {
    try {
      // Simulación de conexión a broker
      console.log(`Conectando a ${selectedBroker}...`);
      
      // Simular delay de conexión
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setBrokerConnected(true);
      sendNotification('Broker Conectado', {
        body: `✅ Conectado a ${selectedBroker} exitosamente`,
        icon: '🔗'
      });
    } catch (error) {
      console.error('Error conectando a broker:', error);
      sendNotification('Error de Conexión', {
        body: `❌ No se pudo conectar a ${selectedBroker}`,
        icon: '⚠️'
      });
    }
  };

  // Ejecutar backtesting
  const runBacktest = async () => {
    setBacktest({ running: true, results: null });
    
    // Simular backtesting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generar resultados simulados
    const results = {
      totalTrades: 45,
      winningTrades: 28,
      losingTrades: 17,
      winRate: ((28 / 45) * 100).toFixed(1),
      totalProfit: 2450.50,
      profitFactor: 1.8,
      maxDrawdown: 12.5,
      avgWin: 125.50,
      avgLoss: 85.20,
      sharpeRatio: 1.45
    };

    setBacktest({ running: false, results });
    sendNotification('Backtesting Completo', {
      body: `📊 Backtesting finalizado. Win Rate: ${results.winRate}%`,
      icon: '✅'
    });
  };

  // Calcular lotes
  const calculateLots = () => {
    if (riskType === 'fixed-risk') {
      const pointsRisk = Math.abs(entryPrice - stopLossPrice);
      if (pointsRisk === 0) return 0;
      return (riskAmount / (pointsRisk * 100)).toFixed(3);
    }
    return lots;
  };

  // Obtener horario óptimo
  const getTradingHours = () => {
    const hours = [
      { time: '00:00-03:00', session: 'Sídney', volatility: 'Baja', profitability: 35, color: 'bg-yellow-900' },
      { time: '03:00-08:00', session: 'Tokio', volatility: 'Media', profitability: 60, color: 'bg-orange-700' },
      { time: '08:00-13:00', session: 'Londres', volatility: 'ALTA', profitability: 85, color: 'bg-green-700' },
      { time: '13:00-14:00', session: 'Pausa', volatility: 'Muy Baja', profitability: 20, color: 'bg-red-900' },
      { time: '14:00-21:00', session: 'Nueva York', volatility: 'MUY ALTA', profitability: 95, color: 'bg-green-600' },
      { time: '21:00-00:00', session: 'Cierre', volatility: 'Baja', profitability: 40, color: 'bg-yellow-900' }
    ];
    return hours;
  };

  const getCurrentSession = () => {
    const hour = currentTime.getHours();
    const hours = getTradingHours();
    if (hour >= 0 && hour < 3) return hours[0];
    if (hour >= 3 && hour < 8) return hours[1];
    if (hour >= 8 && hour < 13) return hours[2];
    if (hour >= 13 && hour < 14) return hours[3];
    if (hour >= 14 && hour < 21) return hours[4];
    return hours[5];
  };

  // Abrir posición
  const openPosition = () => {
    if (!entryPrice || !takeProfitPrice || !stopLossPrice) {
      alert('Completa todos los campos');
      return;
    }

    const calculatedLots = riskType === 'fixed-risk' ? parseFloat(calculateLots()) : lots;
    const newPosition = {
      id: Date.now(),
      asset: selected,
      type: price >= entryPrice ? 'LONG' : 'SHORT',
      lots: calculatedLots,
      entry: entryPrice,
      current: price,
      tp: takeProfitPrice,
      sl: stopLossPrice,
      openTime: currentTime.toLocaleTimeString('es-ES'),
      risk: ((Math.abs(entryPrice - stopLossPrice) * calculatedLots * 100).toFixed(2))
    };

    const newPositions = [...positions, newPosition];
    setPositions(newPositions);
    localStorage.setItem('positions', JSON.stringify(newPositions));
    setBalance(balance - (calculatedLots * entryPrice));

    sendNotification('Posición Abierta', {
      body: `📈 ${selected} • ${newPosition.type} • ${calculatedLots} lotes`,
      icon: '✅'
    });
  };

  // Cerrar posición
  const closePosition = (id) => {
    const position = positions.find(p => p.id === id);
    if (position) {
      const closePnL = ((price - position.entry) * position.lots * 100).toFixed(2);
      const historyEntry = {
        id: Date.now(),
        ...position,
        closedAt: currentTime.toLocaleTimeString('es-ES'),
        closeDate: currentTime.toLocaleDateString('es-ES'),
        closedPrice: price,
        finalPnL: closePnL,
        finalPercent: (((price - position.entry) / position.entry) * 100).toFixed(2)
      };

      const newHistory = [historyEntry, ...operationHistory];
      setOperationHistory(newHistory);
      localStorage.setItem('tradingHistory', JSON.stringify(newHistory));

      const newPositions = positions.filter(p => p.id !== id);
      setPositions(newPositions);
      localStorage.setItem('positions', JSON.stringify(newPositions));
      setBalance(balance + (position.lots * price));

      sendNotification('Posición Cerrada', {
        body: `💰 P&L: ${closePnL >= 0 ? '+' : ''}$${closePnL}`,
        icon: closePnL >= 0 ? '✅' : '❌'
      });
    }
  };

  // Crear orden
  const createOrder = () => {
    const newOrder = {
      id: Date.now(),
      asset: selected,
      type: 'BUY LIMIT',
      lots: lots,
      limitPrice: entryPrice,
      tp: takeProfitPrice,
      sl: stopLossPrice,
      status: 'PENDIENTE',
      createdTime: currentTime.toLocaleTimeString('es-ES')
    };
    setOrders([...orders, newOrder]);
    sendNotification('Orden Creada', {
      body: `📌 ${selected} • ${lots} lotes a ${entryPrice.toFixed(3)}`,
      icon: '📋'
    });
  };

  // Crear alerta
  const createAlert = () => {
    if (!alertPrice) return;
    const newAlert = {
      id: Date.now(),
      asset: selected,
      price: alertPrice,
      type: alertPrice > price ? 'above' : 'below',
      createdTime: currentTime.toLocaleTimeString('es-ES')
    };
    setAlerts([...alerts, newAlert]);
    sendNotification('Alerta Configurada', {
      body: `🔔 ${selected} • Alerta si llega a ${alertPrice.toFixed(3)}`,
      icon: '🎯'
    });
  };

  // Estadísticas
  const getStats = () => {
    if (operationHistory.length === 0) {
      return { wins: 0, losses: 0, winRate: 0, totalProfit: 0 };
    }
    const wins = operationHistory.filter(op => parseFloat(op.finalPnL) > 0).length;
    const losses = operationHistory.filter(op => parseFloat(op.finalPnL) < 0).length;
    const totalProfit = operationHistory.reduce((sum, op) => sum + parseFloat(op.finalPnL), 0).toFixed(2);
    return { wins, losses, winRate: ((wins / operationHistory.length) * 100).toFixed(1), totalProfit };
  };

  const stats = getStats();
  const currentSession = getCurrentSession();

  // Detectar señales de indicadores
  const getIndicatorSignals = () => {
    if (chartData.length === 0) return { rsi: 'Neutral', macd: 'Neutral', bollinger: 'Neutral' };
    
    const lastCandle = chartData[chartData.length - 1];
    const rsiSignal = lastCandle.rsi < 30 ? 'COMPRA' : lastCandle.rsi > 70 ? 'VENTA' : 'Neutral';
    const macdSignal = lastCandle.macd > lastCandle.signal ? 'ALCISTA' : 'BAJISTA';
    const bollingerSignal = lastCandle.price > lastCandle.bollUpper ? 'SOBREVENTA' : lastCandle.price < lastCandle.bollLower ? 'SOBRECOMPRA' : 'Neutral';

    return { rsi: rsiSignal, macd: macdSignal, bollinger: bollingerSignal };
  };

  const signals = getIndicatorSignals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-white overflow-x-hidden">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🚀</div>
            <div>
              <h1 className="text-3xl font-bold">PRO TRADING SUITE</h1>
              <p className="text-slate-400 text-sm">Plataforma profesional con IA, backtesting y análisis técnico</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-right">
              <p className="text-slate-400 text-sm">🕐 {currentTime.toLocaleTimeString('es-ES')}</p>
              <p className="text-3xl font-bold text-green-400">${balance.toFixed(2)}</p>
            </div>
            <div className={`${currentSession.color} rounded px-3 py-1 text-sm font-bold text-center`}>
              {currentSession.session} • Rentabilidad: {currentSession.profitability}%
            </div>
          </div>
        </div>

        {/* Conexión a Broker */}
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-lg p-4 mb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${brokerConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <div>
                <p className="font-bold">{brokerConnected ? '✅ Conectado a Broker' : '❌ Broker Desconectado'}</p>
                <p className="text-slate-300 text-sm">{selectedBroker}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedBroker}
                onChange={(e) => setSelectedBroker(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              >
                <option>MetaTrader5</option>
                <option>XM</option>
                <option>Interactive Brokers</option>
                <option>Alpaca</option>
                <option>Binance</option>
              </select>
              <button
                onClick={connectBroker}
                disabled={brokerConnected}
                className={`px-4 py-2 rounded font-bold text-sm ${
                  brokerConnected
                    ? 'bg-slate-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {brokerConnected ? '✓ Conectado' : 'Conectar'}
              </button>
            </div>
          </div>
        </div>

        {/* Precio */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-4 mb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-slate-300 text-sm">Precio {selected}</p>
              <p className="text-5xl font-bold">{price.toFixed(3)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['XAU/USD', 'EUR/USD', 'BTC/USD'].map(asset => (
                <button
                  key={asset}
                  onClick={() => setSelected(asset)}
                  className={`px-4 py-2 rounded text-sm font-bold ${
                    selected === asset
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-500 hover:bg-blue-400'
                  }`}
                >
                  {asset}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPrice(price + 0.1)} className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded font-bold">▲ +0.1</button>
              <button onClick={() => setPrice(price - 0.1)} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded font-bold">▼ -0.1</button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Panel Principal */}
        <div className="lg:col-span-3 space-y-4">
          {/* Gráfico con Indicadores */}
          <div className="bg-slate-800 bg-opacity-50 rounded-lg p-4 border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Activity size={20} /> Gráfico Avanzado (5M)
              </h2>
              <div className="text-xs text-slate-400 space-y-1">
                <p>RSI: <span className={signals.rsi === 'COMPRA' ? 'text-green-400 font-bold' : signals.rsi === 'VENTA' ? 'text-red-400 font-bold' : 'text-yellow-400'}>{signals.rsi}</span></p>
                <p>MACD: <span className={signals.macd === 'ALCISTA' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{signals.macd}</span></p>
              </div>
            </div>

            {/* Gráfico de precio con Bollinger */}
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" yAxisId="left" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Area yAxisId="left" type="monotone" dataKey="bollUpper" fill="#22c55e" stroke="#22c55e" isAnimationActive={false} fillOpacity={0.1} />
                <Area yAxisId="left" type="monotone" dataKey="bollLower" fill="#ef4444" stroke="#ef4444" isAnimationActive={false} fillOpacity={0.1} />
                <Line yAxisId="left" type="monotone" dataKey="price" stroke="#3b82f6" isAnimationActive={false} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>

            {/* RSI */}
            <div className="mt-4">
              <p className="text-sm font-bold mb-2">RSI (14)</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" height={20} />
                  <YAxis stroke="#94a3b8" domain={[0, 100]} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b' }} />
                  <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" />
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="rsi" stroke="#f59e0b" isAnimationActive={false} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* MACD */}
            <div className="mt-4">
              <p className="text-sm font-bold mb-2">MACD</p>
              <ResponsiveContainer width="100%" height={100}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" height={20} />
                  <YAxis stroke="#94a3b8" width={30} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b' }} />
                  <Bar dataKey="macd" fill="#3b82f6" isAnimationActive={false} />
                  <Line type="monotone" dataKey="signal" stroke="#ef4444" isAnimationActive={false} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Backtesting */}
          <div className="bg-slate-800 bg-opacity-50 rounded-lg p-4 border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Zap size={20} /> Backtesting Automático
              </h2>
              <button
                onClick={runBacktest}
                disabled={backtest.running}
                className={`px-4 py-2 rounded font-bold ${
                  backtest.running
                    ? 'bg-slate-600 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {backtest.running ? '⏳ Procesando...' : '▶ Ejecutar'}
              </button>
            </div>

            {backtest.results ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-700 rounded p-3">
                  <p className="text-slate-400 text-xs">Operaciones</p>
                  <p className="text-white font-bold text-lg">{backtest.results.totalTrades}</p>
                </div>
                <div className="bg-green-900 bg-opacity-50 rounded p-3">
                  <p className="text-green-300 text-xs">Ganadoras</p>
                  <p className="text-green-400 font-bold text-lg">{backtest.results.winningTrades}</p>
                </div>
                <div className="bg-red-900 bg-opacity-50 rounded p-3">
                  <p className="text-red-300 text-xs">Perdedoras</p>
                  <p className="text-red-400 font-bold text-lg">{backtest.results.losingTrades}</p>
                </div>
                <div className="bg-blue-900 bg-opacity-50 rounded p-3">
                  <p className="text-blue-300 text-xs">Win Rate</p>
                  <p className="text-blue-400 font-bold text-lg">{backtest.results.winRate}%</p>
                </div>
                <div className="bg-yellow-900 bg-opacity-50 rounded p-3">
                  <p className="text-yellow-300 text-xs">Ganancia Total</p>
                  <p className="text-yellow-400 font-bold text-lg">${backtest.results.totalProfit}</p>
                </div>
                <div className="bg-slate-700 rounded p-3">
                  <p className="text-slate-400 text-xs">Profit Factor</p>
                  <p className="text-white font-bold text-lg">{backtest.results.profitFactor}</p>
                </div>
                <div className="bg-slate-700 rounded p-3">
                  <p className="text-slate-400 text-xs">Max Drawdown</p>
                  <p className="text-white font-bold text-lg">-{backtest.results.maxDrawdown}%</p>
                </div>
                <div className="bg-slate-700 rounded p-3">
                  <p className="text-slate-400 text-xs">Sharpe Ratio</p>
                  <p className="text-white font-bold text-lg">{backtest.results.sharpeRatio}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-6">Presiona "Ejecutar" para correr el backtesting</p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setActiveTab('trading')} className={`py-2 px-4 rounded-lg font-bold ${activeTab === 'trading' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
              ⚡ Trading
            </button>
            <button onClick={() => setActiveTab('positions')} className={`py-2 px-4 rounded-lg font-bold ${activeTab === 'positions' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
              📂 Posiciones ({positions.length})
            </button>
            <button onClick={() => setActiveTab('alerts')} className={`py-2 px-4 rounded-lg font-bold ${activeTab === 'alerts' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
              🔔 Alertas ({alerts.length})
            </button>
            <button onClick={() => setActiveTab('history')} className={`py-2 px-4 rounded-lg font-bold ${activeTab === 'history' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
              📋 Historial ({operationHistory.length})
            </button>
          </div>

          {/* Trading */}
          {activeTab === 'trading' && (
            <div className="bg-slate-800 bg-opacity-50 rounded-lg p-4 border border-slate-700 space-y-4">
              <h2 className="text-lg font-bold">⚡ NUEVA OPERACIÓN</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input type="number" placeholder="Entrada" value={entryPrice} onChange={(e) => setEntryPrice(parseFloat(e.target.value))} className="bg-slate-700 rounded px-3 py-2 text-white border border-slate-600" step="0.01" />
                <input type="number" placeholder="TP" value={takeProfitPrice} onChange={(e) => setTakeProfitPrice(parseFloat(e.target.value))} className="bg-slate-700 rounded px-3 py-2 text-white border border-slate-600" step="0.01" />
                <input type="number" placeholder="SL" value={stopLossPrice} onChange={(e) => setStopLossPrice(parseFloat(e.target.value))} className="bg-slate-700 rounded px-3 py-2 text-white border border-slate-600" step="0.01" />
                <input type="number" placeholder="Lotes" value={lots} onChange={(e) => setLots(parseFloat(e.target.value))} className="bg-slate-700 rounded px-3 py-2 text-white border border-slate-600" step="0.01" />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setRiskType('fixed-risk')} className={`flex-1 py-2 rounded font-bold ${riskType === 'fixed-risk' ? 'bg-purple-600' : 'bg-slate-700'}`}>Riesgo Fijo</button>
                <button onClick={() => setRiskType('fixed-lots')} className={`flex-1 py-2 rounded font-bold ${riskType === 'fixed-lots' ? 'bg-purple-600' : 'bg-slate-700'}`}>Lotes Fijos</button>
              </div>

              {riskType === 'fixed-risk' && (
                <div>
                  <input type="number" value={riskAmount} onChange={(e) => setRiskAmount(parseFloat(e.target.value))} placeholder="Riesgo ($)" className="w-full bg-slate-700 rounded px-3 py-2 text-white border border-slate-600" step="10" />
                  <p className="text-slate-400 text-xs mt-2">→ Lotes: {calculateLots()}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={openPosition} className="flex-1 bg-green-600 hover:bg-green-700 rounded-lg py-3 font-bold">✓ COMPRAR</button>
                <button onClick={createOrder} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg py-3 font-bold">📌 ORDEN</button>
              </div>
            </div>
          )}

          {/* Posiciones */}
          {activeTab === 'positions' && (
            <div className="bg-slate-800 bg-opacity-50 rounded-lg p-4 border border-slate-700 space-y-3">
              <h2 className="text-lg font-bold">📂 POSICIONES</h2>
              {positions.length === 0 ? (
                <p className="text-slate-400 text-center py-6">No hay posiciones abiertas</p>
              ) : (
                positions.map(pos => (
                  <div key={pos.id} className="bg-slate-700 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold">{pos.asset} • {pos.type}</p>
                        <p className="text-slate-400 text-xs">{pos.entry.toFixed(3)} → {pos.current.toFixed(3)} | {pos.openTime}</p>
                      </div>
                      <button onClick={() => closePosition(pos.id)} className="bg-red-600 hover:bg-red-700 rounded px-3 py-1 text-sm">Cerrar</button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div><p className="text-slate-400">Lotes</p><p className="font-bold">{pos.lots.toFixed(3)}</p></div>
                      <div><p className="text-slate-400">Riesgo</p><p className="text-yellow-400 font-bold">${pos.risk}</p></div>
                      <div><p className="text-slate-400">TP</p><p className="text-green-400 font-bold">{pos.tp.toFixed(3)}</p></div>
                      <div><p className="text-slate-400">SL</p><p className="text-red-400 font-bold">{pos.sl.toFixed(3)}</p></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Alertas */}
          {activeTab === 'alerts' && (
            <div className="bg-slate-800 bg-opacity-50 rounded-lg p-4 border border-slate-700 space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Bell size={20} /> ALERTAS
              </h2>
              <div className="flex gap-2">
                <input type="number" placeholder="Precio" value={alertPrice} onChange={(e) => setAlertPrice(parseFloat(e.target.value))} className="flex-1 bg-slate-700 rounded px-3 py-2 text-white border border-slate-600" step="0.01" />
                <button onClick={createAlert} className="bg-yellow-600 hover:bg-yellow-700 rounded px-4 py-2 font-bold">Crear</button>
              </div>
              {alerts.length === 0 ? (
                <p className="text-slate-400 text-center py-6">No hay alertas</p>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className="bg-slate-700 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{alert.asset}</p>
                      <p className="text-slate-400 text-xs">Si precio {alert.type === 'above' ? '≥' : '≤'} ${alert.price}</p>
                    </div>
                    <button onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))} className="bg-red-600 p-2 rounded">
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Historial */}
          {activeTab === 'history' && (
            <div className="bg-slate-800 bg-opacity-50 rounded-lg p-4 border border-slate-700 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">📋 HISTORIAL</h2>
                {operationHistory.length > 0 && (
                  <button className="bg-blue-600 hover:bg-blue-700 rounded px-3 py-2 text-sm font-bold flex items-center gap-2">
                    <Download size={16} /> CSV
                  </button>
                )}
              </div>
              {operationHistory.length === 0 ? (
                <p className="text-slate-400 text-center py-6">No hay operaciones cerradas</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {operationHistory.map(op => (
                    <div key={op.id} className="bg-slate-700 rounded-lg p-3 flex justify-between">
                      <div>
                        <p className="font-bold">{op.asset}</p>
                        <p className="text-slate-400 text-xs">{op.entry.toFixed(3)} → {op.closedPrice.toFixed(3)}</p>
                      </div>
                      <div className="text-right">
                        <p className={op.finalPnL >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>${op.finalPnL}</p>
                        <p className={op.finalPercent >= 0 ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>{op.finalPercent}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel Derecho */}
        <div className="space-y-4">
          {/* Notificaciones */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">🔔 NOTIFICACIONES</h3>
              <button
                onClick={requestNotifications}
                className={`text-xs px-2 py-1 rounded ${
                  notificationsEnabled
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {notificationsEnabled ? '✓ Activo' : 'Activar'}
              </button>
            </div>
            <p className="text-slate-400 text-xs">
              {notificationsEnabled
                ? '✅ Recibirás alertas en tiempo real'
                : '⚠️ Habilita notificaciones del navegador'}
            </p>
          </div>

          {/* Estadísticas */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
            <h3 className="font-bold mb-3">📊 STATS</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <p className="text-slate-400">Operaciones</p>
                <p className="font-bold">{operationHistory.length}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-slate-400">Ganadoras</p>
                <p className="text-green-400 font-bold">{stats.wins}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-slate-400">Perdedoras</p>
                <p className="text-red-400 font-bold">{stats.losses}</p>
              </div>
              <div className="h-px bg-slate-700"></div>
              <div className="flex justify-between">
                <p className="text-slate-400">Win Rate</p>
                <p className={stats.winRate >= 50 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{stats.winRate}%</p>
              </div>
              <div className="flex justify-between">
                <p className="text-slate-400">Ganancia</p>
                <p className={stats.totalProfit >= 0 ? 'text-green-400 font-bold text-lg' : 'text-red-400 font-bold text-lg'}>${stats.totalProfit}</p>
              </div>
            </div>
          </div>

          {/* Calculadora */}
          <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-4">
            <h3 className="font-bold mb-3">🧮 RIESGO</h3>
            <div className="space-y-2 text-sm">
              <div className="bg-purple-700 bg-opacity-50 rounded p-2">
                <p className="text-purple-300 text-xs">Riesgo</p>
                <p className="font-bold">${riskAmount}</p>
              </div>
              <div className="bg-purple-700 bg-opacity-50 rounded p-2">
                <p className="text-purple-300 text-xs">Lotes</p>
                <p className="font-bold">{calculateLots()}</p>
              </div>
            </div>
          </div>

          {/* Señales */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
            <h3 className="font-bold mb-3">⚡ SEÑALES</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <p>RSI</p>
                <span className={`px-2 py-1 rounded font-bold ${
                  signals.rsi === 'COMPRA' ? 'bg-green-600' : signals.rsi === 'VENTA' ? 'bg-red-600' : 'bg-slate-600'
                }`}>
                  {signals.rsi}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p>MACD</p>
                <span className={`px-2 py-1 rounded font-bold ${
                  signals.macd === 'ALCISTA' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  {signals.macd}
                </span>
              </div>
            </div>
          </div>

          {/* Tip */}
          <div className="bg-yellow-900 bg-opacity-30 rounded-lg p-3 border border-yellow-700">
            <p className="text-yellow-300 text-xs font-bold mb-2">💡 CONSEJO:</p>
            <p className="text-yellow-100 text-xs">
              Actualmente en {currentSession.session}. Rentabilidad: {currentSession.profitability}%. {currentSession.profitability > 70 ? '✓ Excelente momento' : '⚠️ Moderado'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedTradingApp;