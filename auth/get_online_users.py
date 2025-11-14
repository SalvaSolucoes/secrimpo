import sys
import json
from keyauth import api

# Credenciais KeyAuth
keyauthapp = api(
    name="Credencial Removida",
    ownerid="Credencial Removida",
    version="Credencial Removida",
    hash_to_check=""  # Hash vazio - não verificar integridade do executável
)

def get_online_users_count():
    try:
        # Buscar usuários online
        online_users = keyauthapp.fetchOnline()
        
        if online_users is None:
            # Nenhum usuário online
            count = 0
        else:
            # Contar usuários
            count = len(online_users)
        
        # Retornar JSON com sucesso
        result = {
            "success": True,
            "count": count
        }
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        # Retornar erro em JSON
        result = {
            "success": False,
            "count": 0,
            "error": str(e)
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    get_online_users_count()
