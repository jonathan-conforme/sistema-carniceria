<?php

namespace App\Http\Requests;

use App\Models\Compra;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class GuardarDespieceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'compra_id'                   => ['required', 'integer', 'exists:compras,id'],
            'pieza_origen'              => ['required', 'in:pierna,brazo,lomo,costilla,mixto'],
            'observacion'               => ['nullable', 'string', 'max:255'],
            'peso_bruto_usado_libras'   => ['required', 'numeric', 'min:0.10'],
            'detalles'                  => ['required', 'array', 'min:1'],
            'detalles.*.producto_id'    => ['required', 'integer', 'distinct', 'exists:productos,id'],
            'detalles.*.libras_obtenidas' => ['required', 'numeric', 'min:0.05'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $compra = Compra::find($this->input('compra_id'));
                $peso_bruto = (float) $this->input('peso_bruto_usado_libras');

                if ($compra && $peso_bruto > (float) $compra->peso_disponible_bruto_libras) {
                    $validator->errors()->add(
                        'peso_bruto_usado_libras',
                        "Solo quedan {$compra->peso_disponible_bruto_libras} lb brutas disponibles en esta compra."
                    );
                }

                $total_util = collect($this->input('detalles', []))
                    ->sum(fn ($item) => (float) ($item['libras_obtenidas'] ?? 0));

                if ($total_util > $peso_bruto) {
                    $validator->errors()->add(
                        'detalles',
                        "Las libras útiles obtenidas ({$total_util} lb) no pueden superar las libras brutas sacadas ({$peso_bruto} lb)."
                    );
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'compra_id.exists'                => 'La compra seleccionada no existe.',
            'pieza_origen.in'                 => 'La pieza debe ser pierna, brazo, lomo, costilla o mixto.',
            'detalles.required'               => 'Debes registrar al menos un corte obtenido.',
            'detalles.*.producto_id.distinct' => 'No repitas el mismo corte dentro de la misma sesión.',
        ];
    }
}
