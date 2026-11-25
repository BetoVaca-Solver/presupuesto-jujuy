# Presupuesto de Jujuy a precios promedio de 2025

Corte de información del 24 de noviembre de 2026. Comparación de créditos iniciales y recursos previstos de la Administración Central y organismos descentralizados. Se usan las leyes de 2025 y 2026 y el proyecto del Ejecutivo para 2027.

## Qué se toma de INDEC

INDEC divide valores corrientes por índices de precios en sus estimaciones a precios constantes. Por ejemplo, en la Encuesta de Supermercados combina distintos componentes del IPC según los artículos vendidos y luego agrega los importes ya deflactados. Su calculadora de IPC permite actualizar un monto entre dos meses. Para créditos presupuestarios anuales, la Oficina de Presupuesto del Congreso ofrece un antecedente directo de comparación de variaciones nominales con la inflación promedio proyectada.

Este análisis aplica un único índice general a los agregados presupuestarios para expresar sus valores en unidades de poder adquisitivo de 2025, con referencia a la canasta de consumo de los hogares del NOA. Es una decisión metodológica del análisis. El IPC general regional no mide el precio de la canasta de compras del Estado. Una comparación de volúmenes de obra, insumos específicos o dotación de personal requeriría índices o datos físicos pertinentes para cada caso.

## Serie y cálculo

Se usa el IPC nivel general de la región Noroeste (código 0, región Noroeste, base diciembre de 2016 = 100), extraído del CSV oficial publicado el 12/11/2026. Se utiliza el nivel del índice publicado, antes que acumular tasas mensuales redondeadas. La referencia elegida para los pesos constantes es el promedio de enero a diciembre de 2025. Esta referencia es independiente de la base original del índice.

1. Para cada año se calcula el promedio aritmético de los doce niveles mensuales del IPC. Se usa este promedio como aproximación para montos anuales sin calendario de ejecución.
2. Se divide el IPC promedio del año por el de 2025 para obtener el deflactor relativo a la base.
3. Se divide cada monto nominal por ese deflactor. Equivale a multiplicar el monto nominal por IPC promedio 2025 / IPC promedio del ejercicio.
4. La variación real interanual surge de dividir los montos constantes de ambos años y restar 1. Equivale a (1 + variación nominal) / (1 + inflación promedio interanual) − 1, con tasas expresadas en decimales.
5. Si se dispone de ejecución devengada mensual, se puede ajustar mes por mes con el índice correspondiente, expresar todos los meses en la misma base y después sumar. Un mismo factor anual para todas las partidas conserva su participación dentro del gasto del ejercicio.

## Observados y escenarios

- **2025.** Doce observaciones oficiales del IPC del NOA.
- **2026.** Diez observaciones oficiales y dos meses proyectados. Sobre el último nivel observado del NOA se aplican 1,7% en noviembre y 1,8% en diciembre, medianas nacionales del REM de octubre de 2026. Se usan como supuesto para la región.
- **2027.** Doce meses proyectados. Enero a abril usan, respectivamente, 1,7%, 1,6%, 1,7% y 1,7% de la misma encuesta nacional. Para mayo a diciembre se usa una tasa mensual uniforme igual a ((1 + objetivo dic/dic) / producto de los factores de enero a abril) elevado a 1/8, menos 1.
- Los objetivos diciembre contra diciembre son 18,6%, 21,9% y 25,6% para los escenarios bajo, central y alto. Corresponden a P10, mediana y P90 del REM nacional. La senda mensual que se aplica al NOA es una construcción del análisis. Los escenarios muestran sensibilidad y no constituyen un intervalo de confianza. Las tasas de cierre se convierten en niveles mensuales y recién entonces en promedios anuales.

En el escenario central, el IPC promedio estimado sube 32,88% en 2026 frente a 2025 y 23,52% en 2027 frente a 2026. Los multiplicadores a pesos de 2025 son aproximadamente 1,00000000, 0,75257014 y 0,60929402. Los CSV conservan más decimales que los cuadros para publicación. La cifra real de 2026 se actualizará al incorporar noviembre y diciembre observados. La de 2027 depende del escenario.

## Alcance presupuestario y archivos

El gasto total excluye las aplicaciones financieras. La amortización está expuesta aparte. Se comparan las finalidades de 2025 y 2026 según los cuadros de sus respectivas leyes. La clasificación por finalidad del proyecto 2027 tiene otra apertura y queda pendiente el cruce a nivel de funciones o partidas. Los cambios del nivel de precios y de la clasificación presupuestaria son cuestiones distintas.

- serie_ipc_divisiones.csv y serie_ipc_metadatos.txt contienen la publicación oficial preservada sin transformaciones.
- IPC_NOA_mensual_y_escenarios.csv contiene los niveles de enero 2025 a diciembre 2027, con fuente y estado de cada dato.
- Factores_anuales_base_2025.csv contiene promedios anuales, meses observados y proyectados, inflación promedio interanual y multiplicadores.
- Presupuesto_Jujuy_pesos_constantes_2025.csv contiene montos nominales, constantes y variaciones interanuales de los agregados comparables y de las finalidades 2025–2026. Las participaciones solo se informan para conceptos que son parte del gasto total.
- Reproducir_calculo.py permite regenerar los tres CSV derivados con Python 3. Se ejecuta desde esta carpeta con el CSV oficial presente. Los CSV derivados usan punto y coma como separador de campos y coma decimal.

## Fuentes primarias

- [INDEC, Metodología n.º 30, secciones 2.7 y 3.7](https://www.indec.gob.ar/ftp/cuadros/economia/metodologia30_supermercados_mayoristas.pdf)
- [INDEC, calculadora de variaciones del IPC](https://www.indec.gob.ar/ftp/calculadora_ipc/calculadora-actualizado.html)
- [INDEC, IPC de octubre 2026, pp. 6 y 21](https://www.indec.gob.ar/uploads/informesdeprensa/ipc_11_269335F5BA6B.pdf)
- [INDEC, serie oficial de IPC por región y división](https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipc_divisiones.csv)
- [INDEC, metadatos oficiales](https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipc_metadatos.txt)
- [OPC, análisis del proyecto de Presupuesto Nacional 2026, cuadro 26](https://opc.gob.ar/download/47007/?tmstv=1761344242)
- [BCRA, REM octubre 2026, gráfico 1.2 y cuadro 10.1](https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/informes/relevamiento-expectativas-mercado-2026-10.pdf)
- [Jujuy, Ley 6440, arts. 1 a 5](https://boletinoficial.jujuy.gob.ar/?p=303334)
- [Jujuy, Ley 6490, arts. 1 a 5](https://boletinoficial.jujuy.gob.ar/?p=324229)
- [Jujuy, proyecto 2027, arts. 1 a 5, págs. 4 y 5 del PDF](https://drive.google.com/file/d/10MFsmYh9fgqPaH7d3uqZg7cTbm71SsDd/view)

## Año base y fichas temáticas

La interfaz permite dejar los pesos corrientes de origen o elegir pesos promedio de 2025, 2026 o 2027. Para cambiar el año base, se divide el monto constante expresado a precios de 2025 por el factor anual del nuevo año base. El cambio de base modifica el nivel de los montos y conserva la variación real entre períodos, salvo redondeo. Las bases 2026 y 2027 incluyen niveles de IPC proyectados. En indicadores monetarios mensuales se aplica el IPC del mes antes de cambiar la base de precios. Los porcentajes, el IPC publicado y los conteos conservan la unidad original.

En 2027 se incorporan por separado los presupuestos institucionales de Salud, Educación, Cultura y Turismo, Desarrollo Humano y Seguridad (Planilla 6) y las construcciones en bienes de dominio público y privado (suma de los renglones de la Planilla 15). Estas cifras tienen distinto alcance que las finalidades o Trabajos Públicos de 2025 y 2026. En las fichas, la vista completa y la exportación se identifican por concepto y fuente. La serie de variaciones conserva solo los períodos comparables.
