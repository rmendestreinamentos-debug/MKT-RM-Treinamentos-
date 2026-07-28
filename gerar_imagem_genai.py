"""
gerar_imagem_genai.py

Gera imagem pela API da OpenAI usando o SDK oficial: openai (o `from openai
import OpenAI`). Substitui o google-genai, que era o motor anterior.

A chave sai de  _bruto/API KEY/.env  (variavel OPENAI_API_KEY), lida com
python-dotenv. Esse .env fica fora do Git (material bruto), como o resto de _bruto/.

Uso:
    python gerar_imagem_genai.py                      # roda o teste padrao
    python gerar_imagem_genai.py "seu prompt" saida.png
"""

import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

RAIZ = Path(__file__).resolve().parent
ENV_PATH = RAIZ / "_bruto" / "API KEY" / ".env"

if not ENV_PATH.exists():
    sys.exit(f"erro: nao achei o .env em {ENV_PATH}")

load_dotenv(ENV_PATH)
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    sys.exit(f"erro: OPENAI_API_KEY vazia ou ausente em {ENV_PATH}")

client = OpenAI(api_key=API_KEY)

# Modelo de geracao de imagem recomendado hoje pela OpenAI. Lista pra manter a
# mesma forma do motor antigo (tenta um por um e guarda o ultimo erro).
MODELOS = [
    "gpt-image-1",
]


def gerar_imagem(prompt: str, destino: str) -> str:
    """Recebe um prompt de texto, gera a imagem e salva em PNG no caminho `destino`.

    Retorna o caminho salvo. Lanca RuntimeError se nenhum modelo devolver imagem.
    """
    ultimo_erro = None
    for nome in MODELOS:
        try:
            resposta = client.images.generate(
                model=nome,
                prompt=prompt,
                size="1024x1024",
                n=1,
            )
        except Exception as e:
            ultimo_erro = f"{nome}: {e}"
            print(f"  (modelo {nome} nao serviu: {e})")
            continue

        for item in (getattr(resposta, "data", None) or []):
            b64 = getattr(item, "b64_json", None)
            if not b64:
                continue
            dados = base64.b64decode(b64)
            caminho = Path(destino)
            caminho.parent.mkdir(parents=True, exist_ok=True)
            caminho.write_bytes(dados)
            print(f"  (gerado com o modelo {nome})")
            return str(caminho)

        ultimo_erro = f"{nome}: respondeu sem imagem"
        print(f"  (modelo {nome} respondeu sem imagem)")

    raise RuntimeError(f"nenhum modelo devolveu imagem. Ultimo: {ultimo_erro}")


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        prompt = sys.argv[1]
        destino = sys.argv[2]
    else:
        prompt = "um escritorio de advocacia moderno e focado em negocios, com iluminacao natural, sem pessoas"
        destino = str(RAIZ / "teste_openai.png")

    print(f'gerando: "{prompt}"')
    salvo = gerar_imagem(prompt, destino)
    kb = round(Path(salvo).stat().st_size / 1024)
    print(f"salvo: {salvo}  ({kb} KB)")
