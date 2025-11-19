-- Exemplo de consultas para acessar dados relacionados a sessões de caixa
-- Estas consultas demonstram como os dados podem ser acessados e relacionados

-- 1. Consultar todos os pedidos de uma sessão específica com detalhes do cliente
SELECT 
    o.id AS pedido_id,
    o.created_at AS data_pedido,
    c.name AS nome_cliente,
    e.name AS nome_funcionario,
    o.total_value AS valor_total,
    o.payment_method AS forma_pagamento,
    o.status AS status_pedido,
    cs.id AS sessao_caixa_id,
    cs.data_abertura AS data_abertura_caixa
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.employees e ON o.employee_id = e.id
LEFT JOIN public.caixa_sessoes cs ON o.caixa_sessao_id = cs.id
WHERE o.caixa_sessao_id = 1  -- Substituir pelo ID da sessão desejada
ORDER BY o.created_at DESC;

-- 2. Resumo financeiro de uma sessão de caixa
SELECT 
    cs.id AS sessao_id,
    cs.data_abertura,
    cs.data_fechamento,
    cs.valor_abertura,
    cs.valor_fechamento,
    cs.valor_apurado_dinheiro,
    COUNT(o.id) AS total_pedidos,
    SUM(CASE WHEN o.status = 'Concluído' THEN o.total_value ELSE 0 END) AS total_vendas_concluidas,
    SUM(CASE WHEN o.status = 'Pendente' THEN o.total_value ELSE 0 END) AS total_vendas_pendentes,
    SUM(CASE WHEN o.status = 'Cancelado' THEN 1 ELSE 0 END) AS pedidos_cancelados
FROM public.caixa_sessoes cs
LEFT JOIN public.orders o ON cs.id = o.caixa_sessao_id
WHERE cs.id = 1  -- Substituir pelo ID da sessão desejada
GROUP BY cs.id, cs.data_abertura, cs.data_fechamento, cs.valor_abertura, cs.valor_fechamento, cs.valor_apurado_dinheiro;

-- 3. Todos os pedidos com informações completas da sessão
SELECT 
    o.id AS pedido_id,
    o.created_at AS data_pedido,
    c.name AS cliente,
    e.name AS funcionario,
    e.role AS cargo_funcionario,
    cs.id AS sessao_id,
    cs.data_abertura AS data_abertura_caixa,
    cs.valor_abertura AS valor_abertura_caixa,
    o.total_value AS valor_total,
    o.payment_method AS forma_pagamento,
    o.status AS status_pedido,
    CASE 
        WHEN o.status = 'Concluído' THEN 'Venda Realizada'
        WHEN o.status = 'Pendente' THEN 'Venda Pendente'
        WHEN o.status = 'Cancelado' THEN 'Venda Cancelada'
        ELSE 'Outro Status'
    END AS categoria_status
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.employees e ON o.employee_id = e.id
LEFT JOIN public.caixa_sessoes cs ON o.caixa_sessao_id = cs.id
ORDER BY o.created_at DESC;

-- 4. Relatório de vendas por sessão de caixa
SELECT 
    cs.id AS sessao_id,
    u.email AS administrador_email,
    cs.data_abertura,
    cs.data_fechamento,
    EXTRACT(EPOCH FROM (cs.data_fechamento - cs.data_abertura))/3600 AS duracao_horas,
    cs.valor_abertura,
    cs.valor_fechamento,
    cs.valor_apurado_dinheiro,
    COUNT(o.id) AS total_pedidos,
    SUM(CASE WHEN o.status = 'Concluído' THEN o.total_value ELSE 0 END) AS total_vendas,
    SUM(CASE WHEN o.status = 'Concluído' AND o.payment_method = 'Dinheiro' THEN o.total_value ELSE 0 END) AS total_dinheiro,
    SUM(CASE WHEN o.status = 'Concluído' AND o.payment_method = 'Cartão de Crédito' THEN o.total_value ELSE 0 END) AS total_credito,
    SUM(CASE WHEN o.status = 'Concluído' AND o.payment_method = 'Cartão de Débito' THEN o.total_value ELSE 0 END) AS total_debito,
    SUM(CASE WHEN o.status = 'Concluído' AND o.payment_method = 'PIX' THEN o.total_value ELSE 0 END) AS total_pix
FROM public.caixa_sessoes cs
LEFT JOIN public.orders o ON cs.id = o.caixa_sessao_id
LEFT JOIN auth.users u ON cs.user_id = u.id
GROUP BY cs.id, u.email, cs.data_abertura, cs.data_fechamento, cs.valor_abertura, cs.valor_fechamento, cs.valor_apurado_dinheiro
ORDER BY cs.data_abertura DESC;

-- 5. Pedidos pendentes com informações da sessão ativa
SELECT 
    o.id AS pedido_id,
    o.created_at AS data_pedido,
    c.name AS cliente,
    e.name AS funcionario,
    cs.id AS sessao_id,
    cs.data_abertura AS data_abertura_caixa,
    o.total_value AS valor_total,
    o.payment_method AS forma_pagamento,
    EXTRACT(EPOCH FROM (NOW() - o.created_at))/60 AS minutos_pendente
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.employees e ON o.employee_id = e.id
LEFT JOIN public.caixa_sessoes cs ON o.caixa_sessao_id = cs.id
WHERE o.status = 'Pendente'
ORDER BY o.created_at ASC;