# Atlas de infraestructura FEMSA

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Next.js, TypeScript, React, API local, SQLite integrado en Node y Python 3 con biblioteca estándar para lectura XLSX.

## Product Purpose
Herramienta local de análisis del inventario académico de servidores y vulnerabilidades. Importa Excel con formato conocido, conserva cortes y muestra KPIs, filtros, atlas regional, heatmap e inventario detallado. Compara cargas sin confundir ausencia con remediación.

## Users
Evaluadores del proyecto académico FEMSA y analistas que exploran datos ficticios de infraestructura y riesgo.

## Capabilities and Constraints
Interfaz en español, escritorio y móvil. Sin cuentas ni inicio de sesión. Persistencia en este equipo y servidor ligado a localhost. Hojas requeridas: Servidores (17 columnas) y Vulnerabilidades (20). Cada carga conserva fecha de referencia y observaciones. La instalación empieza vacía y cada usuario carga sus propios Excel; no se distribuyen archivos de datos. Sin fuentes CVE ni versiones técnicas. Las bandas no se convierten en fechas o cantidades exactas.

## Brand Commitments
El usuario eligió FEMSA y autorizó mejorar un híbrido de V1 y V3: navegación lateral operativa y lectura ejecutiva sobria, blanco y vino #990033, logo aportado y fuentes existentes. Las 24 propuestas anteriores se conservan en /propuestas, sin enlace desde la navegación del dashboard. El usuario sustituyó el esquema territorial por el componente Route Globe que aportó: puntos blancos y destellos, Norte en EUA, Centro en México y Sur en Brasil como referencias visuales explícitas. Estas ubicaciones no provienen del Excel. Solicitó tipografía mayor, menos cifras simultáneas, análisis secundarios desplegables, preguntas descriptivas y ficha de servidor amplia.

## Evidence on Hand
Excel académico aportado: 246 servidores y 3,450 hallazgos. Solo tres agrupaciones regionales. Diferencias entre volumen declarado y detalle, y entre rangos de antigüedad. Identidad heredada documentada en DESIGN.md y ASSETS.md; manual FEMSA previamente inspeccionado y no redistribuido.

## Product Principles
Conteos desde el detalle. Un mismo alcance filtra KPIs, tablas y visualizaciones. Cortes independientes y persistentes; IDs estables para comparar. Mostrar observaciones sin corregir arbitrariamente la fuente. Conservar niveles y categorías sin diccionario, con interpretaciones provisionales explícitas. Distinguir las referencias geográficas del simulador de los datos del Excel. No inventar CVE, metas o mejoras temporales. Mantener los KPIs disponibles con divulgación progresiva.
