// =================================================================================================
// ARQUIVO DE CONFIGURAÇÃO
// =================================================================================================
//
// Este arquivo centraliza todas as informações que dependem do site do governo.
// Se o site mudar, você só precisa atualizar os valores aqui.
//
// =================================================================================================

// 1. URLs do Site do Governo
const GOV_URLS = {
    login: 'URL_DA_PAGINA_DE_LOGIN_AQUI',
    form: 'URL_DA_PAGINA_DO_FORMULARIO_APOS_LOGIN'
};

// 2. Seletores de Elementos
// Os seletores são os "endereços" de cada campo no HTML do site do governo.
// Use o formato '#id' para IDs ou '.classe' para classes.
// Exemplo: '#campoUsuario', '.botao-login'
const SELECTORS = {
    // --- Campos de Login ---
    userField: '#ID_DO_CAMPO_DE_USUARIO_AQUI',
    passwordField: '#ID_DO_CAMPO_DE_SENHA_AQUI',
    loginButton: '#ID_DO_BOTAO_DE_LOGIN_AQUI',

    // --- Botão de Salvar/Enviar o Formulário ---
    saveFormButton: '#ID_DO_BOTAO_SALVAR_NO_SITE_DO_GOVERNO',

    // --- Mapeamento dos Campos do Formulário ---
    // A chave (ex: 'medico-nome') deve ser IGUAL ao atributo 'name' no index.html.
    // O valor (ex: '#selector_para_nome') é o seletor correspondente no site do governo.
    fields: {
        'medico-nome': '#seletor_para_nome_do_medico',
        'medico-cpf': '#seletor_para_cpf_do_medico',
        'medico-email': '#seletor_para_email_do_medico',
        'perfil-territorio': '#seletor_para_perfil_territorio',
        'municipio-nome': '#seletor_para_municipio_nome',
        'municipio-uf': '#seletor_para_municipio_uf',
        'regiao-saude': '#seletor_para_regiao_saude',
        'unidade-saude': '#seletor_para_unidade_saude',
        'localizacao-unidade': 'input[name="seletor_para_grupo_radio_localizacao"]', // Para radios, use o nome do grupo
        'total-usuarios': '#seletor_para_total_usuarios',
        'modalidade-equipe': '#seletor_para_modalidade_equipe',
        'mais-de-uma-equipe': 'input[name="seletor_para_grupo_radio_mais_de_uma_equipe"]',
        'responsavel-unidade': '#seletor_para_responsavel_unidade',
        'telefone-unidade': '#seletor_para_telefone_unidade',
        'email-unidade': '#seletor_para_email_unidade',

        // Seção 2: Processo de Supervisão
        'data-supervisao': '#seletor_para_data_supervisao',
        'horario-inicio': '#seletor_para_horario_inicio',
        'horario-termino': '#seletor_para_horario_termino',
        'contato-previo': 'input[name="seletor_para_grupo_radio_contato_previo"]',
        'motivo-nao-contato': '#seletor_para_motivo_nao_contato',
        'medico-ausente': 'input[name="seletor_para_grupo_radio_medico_ausente"]',
        'motivo-ausencia': '#seletor_para_motivo_ausencia',
        'comunicou-gestor': 'input[name="seletor_para_grupo_radio_comunicou_gestor"]',
        'comunicou-supervisao': 'input[name="seletor_para_grupo_radio_comunicou_supervisao"]',
        'caso-excepcional': 'input[name="seletor_para_grupo_radio_caso_excepcional"]',
        'quais-casos': '#seletor_para_quais_casos_excepcionais', // Pode ser um select múltiplo
        'objetivo-acompanhamento': '#seletor_para_objetivo_acompanhamento',
        'tematica-principal': '#seletor_para_tematica_principal', // Este pode exigir uma lógica especial se for um modal
        'outras-tematicas': '#seletor_para_outras_tematicas',
        'grupos-prioritarios': '#seletor_para_grupos_prioritarios',
        'dificuldade-conduta': 'input[name="seletor_para_grupo_radio_dificuldade_conduta"]',
        'base-dificuldade': '#seletor_para_base_dificuldade',
        'descricao-dificuldade': '#seletor_para_descricao_dificuldade',
        'ofertas-pedagogicas': '#seletor_para_ofertas_pedagogicas',

        // Seção 4: Suporte do Município
        'apoio-gestao': 'input[name="seletor_para_grupo_radio_apoio_gestao"]',
        'suporte-clinico': 'input[name="seletor_para_grupo_radio_suporte_clinico"]',
        'acesso-rede': 'input[name="seletor_para_grupo_radio_acesso_rede"]',
        'acesso-sistemas': 'input[name="seletor_para_grupo_radio_acesso_sistemas"]',
        'suporte-formacao': 'input[name="seletor_para_grupo_radio_suporte_formacao"]',
        'info-suporte-municipio': '#seletor_para_info_suporte_municipio',

        // Seção 5: Ocorrências
        'informar-tutor': 'input[name="seletor_para_grupo_radio_informar_tutor"]',
        'classificacao-ocorrencia': 'input[name="seletor_para_grupo_radio_classificacao_ocorrencia"]',
        'gravidade-ocorrencia': 'input[name="seletor_para_grupo_radio_gravidade_ocorrencia"]',
        'descricao-ocorrencia': '#seletor_para_descricao_ocorrencia',

        // Seção 6: Próxima Supervisão
        'modalidade-proxima': '#seletor_para_modalidade_proxima',
        'atividades-pactuadas': '#seletor_para_atividades_pactuadas',
        'objetivo-proxima': '#seletor_para_objetivo_proxima',
    }
};

// Exporta as configurações para serem usadas em outros arquivos (como o automation_agent.js)
module.exports = { GOV_URLS, SELECTORS };