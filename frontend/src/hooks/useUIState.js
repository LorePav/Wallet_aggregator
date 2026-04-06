import { useState } from 'react';

export const useUIState = () => {
    // Theme
    const [themeColor, setThemeColor] = useState(() => localStorage.getItem('themeColor') || '#3b82f6');
    const [themeBg, setThemeBg] = useState(() => localStorage.getItem('themeBg') || '#0b0f19');
    const [themeFont, setThemeFont] = useState(() => localStorage.getItem('themeFont') || "'Inter', sans-serif");

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    // Loading & Refresh
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [refreshInterval, setRefreshInterval] = useState(() => {
        const saved = localStorage.getItem('portfolioRefreshInterval');
        return saved ? parseInt(saved, 10) : 30000;
    });

    // Collapsible Sections
    const [sections, setSections] = useState({
        chart: true,
        pies: true,
        portfolio: true,
        transactions: false,
        passive: true
    });
    const toggleSection = (key) => setSections(prev => ({ ...prev, [key]: !prev[key] }));

    // Chart Controls
    const [chartMode, setChartMode] = useState('absolute');
    const [historyPeriod, setHistoryPeriod] = useState('ALL');

    // Table Sorting
    const [sortConfig, setSortConfig] = useState({ key: 'current_value', direction: 'descending' });
    const [txSortConfig, setTxSortConfig] = useState({ key: 'date', direction: 'descending' });
    const [txSearchTerm, setTxSearchTerm] = useState('');
    const [txTypeFilter, setTxTypeFilter] = useState('');
    const [txAssetFilter, setTxAssetFilter] = useState('');
    const [txPeriodFilter, setTxPeriodFilter] = useState('30d');

    // Drag & Drop (Table)
    const [dragInteraction, setDragInteraction] = useState({ isDragging: false, isClicking: false });
    const [draggedItemIdx, setDraggedItemIdx] = useState(null);
    const [dragOverItemIdx, setDragOverItemIdx] = useState(null);
    const [draggedAccountIdx, setDraggedAccountIdx] = useState(null);
    const [dragOverAccountIdx, setDragOverAccountIdx] = useState(null);

    // Pie Chart States
    const [groupSmallAssets, setGroupSmallAssets] = useState(false);
    const [groupSmallCategories, setGroupSmallCategories] = useState(false);
    const [groupSmallDeepDiveAssets, setGroupSmallDeepDiveAssets] = useState(false);
    const [focusedAsset, setFocusedAsset] = useState(null);
    const [focusedCategory, setFocusedCategory] = useState(null);
    const [focusedDeepDiveAsset, setFocusedDeepDiveAsset] = useState(null);
    const [hoveredAsset, setHoveredAsset] = useState(null);
    const [hoveredCategory, setHoveredCategory] = useState(null);
    const [hoveredDeepDiveAsset, setHoveredDeepDiveAsset] = useState(null);
    const [hiddenAssets, setHiddenAssets] = useState({});
    const [hiddenCategories, setHiddenCategories] = useState({});
    const [hiddenDeepDiveAssets, setHiddenDeepDiveAssets] = useState({});

    // Deep Dive
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [editingTxId, setEditingTxId] = useState(null);

    // Custom Colors
    const [customColors, setCustomColors] = useState(() => {
        try { return JSON.parse(localStorage.getItem('customColors')) || {}; }
        catch (e) { return {}; }
    });

    // Visually Hidden Assets
    const [visuallyHiddenAssets, setVisuallyHiddenAssets] = useState(() => {
        try { return JSON.parse(localStorage.getItem('visuallyHiddenAssets')) || {}; }
        catch (e) { return {}; }
    });

    // Custom Orders (localStorage backed)
    const [customAssetOrder, setCustomAssetOrder] = useState(() => {
        try { return JSON.parse(localStorage.getItem('customAssetOrder')) || []; }
        catch (e) { return []; }
    });
    const [pieAssetOrder, setPieAssetOrder] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pieAssetOrder')) || []; }
        catch (e) { return []; }
    });
    const [pieCategoryOrder, setPieCategoryOrder] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pieCategoryOrder')) || []; }
        catch (e) { return []; }
    });
    const [pieAccountOrder, setPieAccountOrder] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pieAccountOrder')) || []; }
        catch (e) { return []; }
    });
    const [accountBalancesOrder, setAccountBalancesOrder] = useState(() => {
        try { return JSON.parse(localStorage.getItem('accountBalancesOrder')) || []; }
        catch (e) { return []; }
    });

    // Form Data
    const [formData, setFormData] = useState({
        symbol: '', name: '', category: 'Azioni', currency: 'EUR',
        date: new Date().toISOString().split('T')[0],
        type: 'Buy', quantity: '', price: '', fees: '0', account: 'Broker'
    });

    // --- Handlers ---
    const handleColorChange = (itemName, newColor) => {
        setCustomColors(prev => {
            const updated = { ...prev, [itemName]: newColor };
            localStorage.setItem('customColors', JSON.stringify(updated));
            return updated;
        });
    };

    const toggleVisualHiddenAsset = (uniqueId) => {
        setVisuallyHiddenAssets(prev => {
            const updated = { ...prev, [uniqueId]: !prev[uniqueId] };
            localStorage.setItem('visuallyHiddenAssets', JSON.stringify(updated));
            return updated;
        });
    };

    const handleIntervalChange = (e) => {
        const val = parseInt(e.target.value, 10);
        setRefreshInterval(val);
        localStorage.setItem('portfolioRefreshInterval', val.toString());
    };

    const handleAssetLegendClick = (data) => {
        setHiddenAssets(prev => ({ ...prev, [data.value]: !prev[data.value] }));
    };

    const handleCategoryLegendClick = (data) => {
        setHiddenCategories(prev => ({ ...prev, [data.value]: !prev[data.value] }));
    };

    const handleDeepDiveLegendClick = (data) => {
        setHiddenDeepDiveAssets(prev => ({ ...prev, [data.value]: !prev[data.value] }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };
        if (name === 'type' && (value === 'Deposit' || value === 'Withdrawal')) {
            if (!['EUR', 'USD', 'GBP', 'JPY'].includes(newFormData.symbol)) {
                newFormData.symbol = 'EUR';
            }
            newFormData.category = 'Liquidità';
        } else if (name === 'type' && formData.category === 'Liquidità' && value !== 'Deposit' && value !== 'Withdrawal') {
            newFormData.category = 'Azioni';
        }
        setFormData(newFormData);
    };

    const requestTxSort = (key) => {
        let direction = 'ascending';
        if (txSortConfig.key === key && txSortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setTxSortConfig({ key, direction });
    };

    const getTxSortIcon = (columnName) => {
        if (txSortConfig.key !== columnName) return '↕';
        return txSortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    };

    return {
        // Theme
        themeColor, setThemeColor, themeBg, setThemeBg, themeFont, setThemeFont,
        // Modals
        isModalOpen, setIsModalOpen, isSettingsOpen, setIsSettingsOpen,
        isTransferModalOpen, setIsTransferModalOpen,
        // Loading & Refresh
        loading, setLoading, autoRefresh, setAutoRefresh, lastUpdated, setLastUpdated,
        refreshInterval, setRefreshInterval,
        // Sections
        sections, setSections, toggleSection,
        // Chart Controls
        chartMode, setChartMode, historyPeriod, setHistoryPeriod,
        // Sorting
        sortConfig, setSortConfig, txSortConfig, txSearchTerm, setTxSearchTerm,
        txTypeFilter, setTxTypeFilter, txAssetFilter, setTxAssetFilter,
        txPeriodFilter, setTxPeriodFilter,
        // Drag & Drop
        dragInteraction, setDragInteraction,
        draggedItemIdx, setDraggedItemIdx, dragOverItemIdx, setDragOverItemIdx,
        draggedAccountIdx, setDraggedAccountIdx, dragOverAccountIdx, setDragOverAccountIdx,
        // Pie Chart
        groupSmallAssets, setGroupSmallAssets, groupSmallCategories, setGroupSmallCategories,
        groupSmallDeepDiveAssets, setGroupSmallDeepDiveAssets,
        focusedAsset, setFocusedAsset, focusedCategory, setFocusedCategory,
        focusedDeepDiveAsset, setFocusedDeepDiveAsset,
        hoveredAsset, setHoveredAsset, hoveredCategory, setHoveredCategory,
        hoveredDeepDiveAsset, setHoveredDeepDiveAsset,
        hiddenAssets, hiddenCategories, hiddenDeepDiveAssets, setHiddenDeepDiveAssets,
        // Deep Dive
        selectedAsset, setSelectedAsset, selectedAccount, setSelectedAccount,
        editingTxId, setEditingTxId,
        // Colors & Visibility
        customColors, handleColorChange, visuallyHiddenAssets, toggleVisualHiddenAsset,
        // Orders
        customAssetOrder, setCustomAssetOrder,
        pieAssetOrder, setPieAssetOrder, pieCategoryOrder, setPieCategoryOrder,
        pieAccountOrder, setPieAccountOrder, accountBalancesOrder, setAccountBalancesOrder,
        // Form
        formData, setFormData,
        // Handlers
        handleIntervalChange, handleAssetLegendClick, handleCategoryLegendClick,
        handleDeepDiveLegendClick, handleInputChange,
        requestTxSort, getTxSortIcon, getInitials
    };
};
