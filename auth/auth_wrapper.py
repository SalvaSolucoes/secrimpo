"""
Wrapper de autenticação KeyAuth para integração com Electron
Utiliza o arquivo oficial keyauth.py com suporte completo a HWID
"""
import sys
import json
import os
import io
from pathlib import Path

# Configurar stdout para modo unbuffered (importante para executáveis PyInstaller)
sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None

# Adicionar o diretório do executável ao sys.path para PyInstaller
if getattr(sys, 'frozen', False):
    # Rodando como executável PyInstaller
    bundle_dir = sys._MEIPASS
    sys.path.insert(0, bundle_dir)
else:
    # Rodando como script Python normal
    bundle_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, bundle_dir)

# Configurações KeyAuth
KEYAUTH_NAME = "Credencial Removida"
KEYAUTH_OWNERID = "Credencial Removida"
KEYAUTH_VERSION = "Credencial Removida"

# Importar KeyAuth oficial
try:
    from keyauth import api
except ImportError as e:
    print(json.dumps({
        "success": False,
        "message": f"Arquivo keyauth.py não encontrado na pasta auth/. Erro: {str(e)}"
    }))
    sys.exit(1)

# Validar configurações
if KEYAUTH_NAME == "seu_app_name_aqui" or KEYAUTH_OWNERID == "seu_owner_id_aqui":
    print(json.dumps({
        "success": False,
        "message": "ERRO: Configure KEYAUTH_NAME e KEYAUTH_OWNERID no arquivo auth_wrapper.py antes de compilar!"
    }))
    sys.exit(1)

if not KEYAUTH_NAME or not KEYAUTH_OWNERID:
    print(json.dumps({
        "success": False,
        "message": "ERRO: KEYAUTH_NAME e KEYAUTH_OWNERID não podem estar vazios!"
    }))
    sys.exit(1)

def categorize_error(error_msg):
    """
    Categoriza mensagens de erro do KeyAuth em mensagens amigáveis
    
    Args:
        error_msg (str): Mensagem de erro original do KeyAuth
        
    Returns:
        dict: Dicionário com tipo de erro e mensagem formatada
    """
    error_msg_lower = error_msg.lower()
    
    # Mapeamento otimizado: cada tipo de erro tem múltiplos padrões de busca
    error_categories = [
        {
            "code": 1,
            "patterns": ["invalid username/password", "invalid credentials"],
            "type": "INVALID_CREDENTIALS",
            "message": "Erro 1: Usuário ou senha incorretos"
        },
        {
            "code": 2,
            "patterns": ["username doesn't exist", "user doesn't exist", "username does not exist", "invalid username", "user not found"],
            "type": "USER_NOT_FOUND",
            "message": "Erro 2: Usuário não encontrado no sistema"
        },
        {
            "code": 3,
            "patterns": ["incorrect password", "wrong password", "password doesn't match", "password does not match", "invalid password"],
            "type": "INVALID_PASSWORD",
            "message": "Erro 3: Senha incorreta"
        },
        {
            "code": 4,
            "patterns": ["hwid doesn't match", "hwid mismatch"],
            "type": "HWID_MISMATCH",
            "message": "Erro 4: Este usuário já está registrado em outro dispositivo. Entre em contato com o administrador para resetar o HWID."
        },
        {
            "code": 5,
            "patterns": ["hwid not found"],
            "type": "HWID_NOT_FOUND",
            "message": "Erro 5: HWID não autorizado. Entre em contato com o administrador."
        },
        {
            "code": 6,
            "patterns": ["subscription expired"],
            "type": "SUBSCRIPTION_EXPIRED",
            "message": "Erro 6: Sua assinatura expirou. Renove para continuar usando o sistema."
        },
        {
            "code": 7,
            "patterns": ["no active subscriptions", "user has no subscription", "no subscription"],
            "type": "NO_SUBSCRIPTION",
            "message": "Erro 7: Você não possui uma assinatura ativa. Entre em contato com o administrador."
        },
        {
            "code": 8,
            "patterns": ["user is banned", "user banned"],
            "type": "USER_BANNED",
            "message": "Erro 8: Seu usuário foi banido do sistema. Entre em contato com o administrador."
        },
        {
            "code": 9,
            "patterns": ["hwid is blacklisted", "hwid blacklisted"],
            "type": "HWID_BLACKLISTED",
            "message": "Erro 9: Seu dispositivo foi bloqueado. Entre em contato com o administrador."
        },
        {
            "code": 10,
            "patterns": ["invalidver", "invalid version"],
            "type": "INVALID_VERSION",
            "message": "Erro 10: Versão da aplicação desatualizada. Por favor, atualize o sistema."
        },
        {
            "code": 11,
            "patterns": ["request timed out", "timed out"],
            "type": "TIMEOUT",
            "message": "Erro 11: Tempo de conexão esgotado. Verifique sua internet e tente novamente."
        },
        {
            "code": 12,
            "patterns": ["connection error", "network error"],
            "type": "CONNECTION_ERROR",
            "message": "Erro 12: Erro de conexão com o servidor. Verifique sua internet."
        }
    ]
    
    # Procurar por padrões conhecidos na mensagem de erro
    for category in error_categories:
        for pattern in category["patterns"]:
            if pattern in error_msg_lower:
                return {
                    "code": category["code"],
                    "type": category["type"],
                    "message": category["message"],
                    "original": error_msg
                }
    
    # Erro genérico se não encontrar padrão específico - traduzir mensagem para português
    # Verificar se contém palavras-chave comuns e traduzir
    if "username" in error_msg_lower or "user" in error_msg_lower:
        friendly_msg = "Usuário inválido ou não encontrado"
    elif "password" in error_msg_lower or "pass" in error_msg_lower:
        friendly_msg = "Senha inválida"
    elif "hwid" in error_msg_lower:
        friendly_msg = "Erro de autenticação de dispositivo"
    elif "subscription" in error_msg_lower:
        friendly_msg = "Erro relacionado à assinatura"
    elif "banned" in error_msg_lower or "ban" in error_msg_lower:
        friendly_msg = "Usuário bloqueado"
    elif "version" in error_msg_lower:
        friendly_msg = "Versão da aplicação inválida"
    elif "timeout" in error_msg_lower or "timed out" in error_msg_lower:
        friendly_msg = "Tempo de conexão esgotado"
    elif "connection" in error_msg_lower or "network" in error_msg_lower:
        friendly_msg = "Erro de conexão"
    else:
        friendly_msg = "Falha na autenticação. Verifique suas credenciais"
    
    return {
        "code": 99,
        "type": "AUTHENTICATION_ERROR",
        "message": f"Erro 99: {friendly_msg}",
        "original": error_msg
    }

class KeyAuthExit(Exception):
    """Exceção customizada para capturar os._exit() do KeyAuth"""
    def __init__(self, message=""):
        self.message = message
        super().__init__(self.message)

def authenticate(username, password):
    """
    Autentica usuário via KeyAuth com HWID automático
    
    O HWID é capturado automaticamente pelo KeyAuth:
    - Windows: SID do usuário (via win32security)
    - Linux: /etc/machine-id
    - macOS: Serial do hardware (IOPlatformSerialNumber)
    
    Args:
        username (str): Nome de usuário
        password (str): Senha do usuário
        
    Returns:
        dict: Resultado da autenticação com dados do usuário
    """
    # Capturar stdout para pegar mensagens de erro do KeyAuth
    old_stdout = sys.stdout
    sys.stdout = captured_output = io.StringIO()
    
    # Monkey-patch os._exit para capturar erros do KeyAuth
    original_exit = os._exit
    def patched_exit(code):
        if code != 0:
            error_msg = captured_output.getvalue().strip()
            raise KeyAuthExit(error_msg)
        original_exit(code)
    
    os._exit = patched_exit
    
    try:
        # Inicializar KeyAuth (hash vazio para aplicação Electron)
        keyauthapp = api(
            name=KEYAUTH_NAME,
            ownerid=KEYAUTH_OWNERID,
            version=KEYAUTH_VERSION,
            hash_to_check=""  # Hash vazio - não verificar integridade do executável
        )
        
        # Login com HWID automático
        # O método login() captura o HWID automaticamente via others.get_hwid()
        # e vincula a sessão ao hardware do usuário
        keyauthapp.login(username, password)
        
        # Restaurar stdout e os._exit
        sys.stdout = old_stdout
        os._exit = original_exit
        
        # Sucesso - retornar dados completos do usuário
        return {
            "success": True,
            "message": "Autenticação realizada com sucesso",
            "userData": {
                "username": keyauthapp.user_data.username,
                "hwid": keyauthapp.user_data.hwid,
                "ip": keyauthapp.user_data.ip,
                "subscription": keyauthapp.user_data.subscription,
                "subscriptions": keyauthapp.user_data.subscriptions,
                "expires": keyauthapp.user_data.expires,
                "createdate": keyauthapp.user_data.createdate,
                "lastlogin": keyauthapp.user_data.lastlogin
            }
        }
        
    except KeyAuthExit as e:
        # Restaurar stdout e os._exit
        sys.stdout = old_stdout
        os._exit = original_exit
        
        # KeyAuth chamou os._exit(1) - capturar a mensagem de erro
        error_output = e.message
        
        if error_output:
            # Categorizar o erro baseado na mensagem capturada
            error_info = categorize_error(error_output)
            return {
                "success": False,
                "errorCode": error_info["code"],
                "errorType": error_info["type"],
                "message": error_info["message"],
                "originalError": error_info.get("original", error_output)
            }
        else:
            return {
                "success": False,
                "errorCode": 98,
                "errorType": "UNKNOWN_ERROR",
                "message": "Erro 98: Erro desconhecido na autenticação. Verifique suas credenciais."
            }
            
    except SystemExit as e:
        # Restaurar stdout e os._exit
        sys.stdout = old_stdout
        os._exit = original_exit
        
        # Capturar a mensagem que foi impressa antes do exit
        error_output = captured_output.getvalue().strip()
        
        if error_output:
            error_info = categorize_error(error_output)
            return {
                "success": False,
                "errorCode": error_info["code"],
                "errorType": error_info["type"],
                "message": error_info["message"],
                "originalError": error_info.get("original", error_output)
            }
        else:
            return {
                "success": False,
                "errorCode": 97,
                "errorType": "UNKNOWN_ERROR",
                "message": "Erro 97: Erro desconhecido (SystemExit). Verifique suas credenciais."
            }
            
    except Exception as e:
        # Restaurar stdout e os._exit
        sys.stdout = old_stdout
        os._exit = original_exit
        
        # Tratar outros erros
        error_message = str(e)
        error_info = categorize_error(error_message)
        
        return {
            "success": False,
            "errorCode": error_info["code"],
            "errorType": error_info["type"],
            "message": error_info["message"],
            "originalError": error_info.get("original", error_message)
        }

def main():
    """Função principal para chamada via Electron"""
    try:
        if len(sys.argv) != 3:
            result = {
                "success": False,
                "errorCode": 96,
                "errorType": "INVALID_ARGS",
                "message": "Erro 96: Argumentos inválidos"
            }
            # Garantir que o JSON seja impresso no stdout
            sys.stdout.write(json.dumps(result) + '\n')
            sys.stdout.flush()
            sys.exit(1)
        
        username = sys.argv[1]
        password = sys.argv[2]
        
        # Realizar autenticação
        result = authenticate(username, password)
        
        # Retornar resultado como JSON - sempre no stdout
        sys.stdout.write(json.dumps(result) + '\n')
        sys.stdout.flush()
        
        # Exit code baseado no sucesso
        sys.exit(0 if result["success"] else 1)
        
    except Exception as e:
        # Capturar qualquer erro não tratado
        error_msg = str(e)
        error_info = categorize_error(error_msg)
        
        error_result = {
            "success": False,
            "errorCode": 94,
            "errorType": "CRITICAL_ERROR",
            "message": f"Erro 94: Erro crítico no sistema - {error_info['message'].replace('Erro 99: ', '')}",
            "originalError": error_msg
        }
        sys.stdout.write(json.dumps(error_result) + '\n')
        sys.stdout.flush()
        sys.exit(1)

if __name__ == "__main__":
    main()
