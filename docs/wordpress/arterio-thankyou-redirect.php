<?php
/**
 * Plugin Name: Arterio — Thank You Redirect
 * Description: Redireciona a página "Order Received" do WooCommerce para o frontend Next.js.
 * Version: 1.1.0
 * Author: Arterio
 *
 * Após o pagamento, o WooCommerce redireciona para:
 *   /checkout/order-received/<order_id>/?key=wc_order_xxx
 *
 * Este snippet intercepta esse redirect e envia o cliente para
 * a página de obrigado do Next.js:
 *   https://www.arterio.com.br/obrigado?order_id=<id>&key=wc_order_xxx
 *
 * INSTALAÇÃO:
 *   Copiar para wp-content/mu-plugins/arterio-thankyou-redirect.php
 *   (mu-plugins são carregados automaticamente — não precisam ser ativados)
 *
 * CONFIGURAÇÃO NECESSÁRIA no wp-config.php:
 *
 *   define('ARTERIO_FRONTEND_URL', 'https://www.arterio.com.br');
 *
 * Para ambiente de dev local, use:
 *   define('ARTERIO_FRONTEND_URL', 'http://localhost:3000');
 *
 * @package Arterio
 */

// ──────────────────────────────────────────────
// 1. Permitir redirect para o domínio do frontend
//    wp_safe_redirect() só aceita domínios na whitelist
// ──────────────────────────────────────────────
add_filter('allowed_redirect_hosts', function (array $hosts): array {
    $frontend_url = defined('ARTERIO_FRONTEND_URL')
        ? ARTERIO_FRONTEND_URL
        : 'https://www.arterio.com.br';

    $parsed = wp_parse_url($frontend_url);

    if (!empty($parsed['host']) && !in_array($parsed['host'], $hosts, true)) {
        $hosts[] = $parsed['host'];
    }

    return $hosts;
});

// ──────────────────────────────────────────────
// 2. Interceptar a página "order-received" e redirecionar
// ──────────────────────────────────────────────
add_action('template_redirect', function () {
    // Só atuar na página order-received do WooCommerce
    if (!function_exists('is_order_received_page') || !is_order_received_page()) {
        return;
    }

    $frontend_url = defined('ARTERIO_FRONTEND_URL')
        ? ARTERIO_FRONTEND_URL
        : 'https://www.arterio.com.br';

    $order_id  = absint(get_query_var('order-received'));
    $order_key = isset($_GET['key']) ? sanitize_text_field($_GET['key']) : '';

    if (!$order_id || !$order_key) {
        return;
    }

    $redirect = add_query_arg(
        [
            'order_id' => $order_id,
            'key'      => $order_key,
        ],
        trailingslashit($frontend_url) . 'obrigado'
    );

    wp_safe_redirect($redirect, 302);
    exit;
});